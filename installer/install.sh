#!/usr/bin/env sh
set -eu

KIBAN_HTTP_PORT="${KIBAN_HTTP_PORT:-8080}"
KIBAN_RELEASE_CHANNEL="${KIBAN_RELEASE_CHANNEL:-latest}"
KIBAN_RELEASE_BASE="${KIBAN_RELEASE_BASE:-https://releases.kibanos.com/${KIBAN_RELEASE_CHANNEL}}"
KIBAN_VERSION="${KIBAN_VERSION:-}"
KIBAN_VERSION_URL="${KIBAN_VERSION_URL:-${KIBAN_RELEASE_BASE}/VERSION}"
KIBAN_COMPOSE_URL="${KIBAN_COMPOSE_URL:-${KIBAN_RELEASE_BASE}/compose.yaml}"
KIBAN_CLI_URL="${KIBAN_CLI_URL:-${KIBAN_RELEASE_BASE}/kiban}"
KIBAN_HOME="${KIBAN_HOME:-$HOME/.kiban}"
KIBAN_USER_HOME="${KIBAN_USER_HOME:-$HOME}"
KIBAN_RUNTIME_DIR="${KIBAN_HOME}/runtime/kiban"
KIBAN_COMPOSE_FILE="${KIBAN_RUNTIME_DIR}/compose.yaml"
KIBAN_ENV_FILE="${KIBAN_RUNTIME_DIR}/.env"
KIBAN_OS="$(uname -s)"

info() { printf '%s\n' "[kiban] $*"; }
fail() { printf '%s\n' "[kiban] Error: $*" >&2; exit 1; }
warn() { printf '%s\n' "[kiban] Warning: $*"; }
command_exists() { command -v "$1" >/dev/null 2>&1; }

sudo_cmd() {
  if [ "$(id -u)" = "0" ]; then
    "$@"
    return
  fi

  command_exists sudo || fail "sudo is required when the installer is not run as root."
  sudo "$@"
}

check_supported_os() {
  case "${KIBAN_OS}" in
    Darwin) return 0 ;;
    Linux) ;;
    *) fail "Unsupported operating system '${KIBAN_OS}'. Kiban v0.1 supports Linux and macOS." ;;
  esac

  [ -r /etc/os-release ] || fail "Cannot detect Linux distribution because /etc/os-release is missing."

  # shellcheck disable=SC1091
  . /etc/os-release
  case "${ID:-}" in
    ubuntu|debian) return 0 ;;
    *) fail "Unsupported distribution '${ID:-unknown}'. Kiban v0.1 supports Ubuntu, Debian and macOS." ;;
  esac
}

check_supported_architecture() {
  case "$(uname -m)" in
    x86_64|amd64|aarch64|arm64) return 0 ;;
    *) fail "Unsupported architecture '$(uname -m)'. Kiban v0.1 supports amd64 and arm64." ;;
  esac
}

ensure_curl() {
  if command_exists curl; then
    return 0
  fi

  [ "${KIBAN_OS}" = "Linux" ] || fail "curl is required. Please install curl and retry."

  info "Installing curl..."
  sudo_cmd apt-get update
  sudo_cmd apt-get install -y curl ca-certificates
}

ensure_docker() {
  if command_exists docker; then
    return 0
  fi

  if [ "${KIBAN_OS}" = "Darwin" ]; then
    fail "Docker is not installed. Please install Docker Desktop for macOS, start it, and retry."
  fi

  ensure_curl
  info "Docker is not installed. Installing Docker using the official Docker installer..."
  curl -fsSL https://get.docker.com -o /tmp/kiban-install-docker.sh
  sudo_cmd sh /tmp/kiban-install-docker.sh
  rm -f /tmp/kiban-install-docker.sh
}

ensure_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    return 0
  fi

  if [ "${KIBAN_OS}" = "Darwin" ]; then
    fail "Docker Compose is not available. Please install Docker Desktop for macOS, start it, and retry."
  fi

  info "Docker Compose plugin is not available. Installing docker-compose-plugin..."
  sudo_cmd apt-get update
  sudo_cmd apt-get install -y docker-compose-plugin
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is required but could not be installed."
}

ensure_port_available() {
  port="$1"

  if command_exists ss && ss -ltn "sport = :${port}" 2>/dev/null | grep -q LISTEN; then
    fail "Port ${port} is already in use. Set KIBAN_HTTP_PORT to another port and retry."
  fi

  if command_exists lsof && lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
    fail "Port ${port} is already in use. Set KIBAN_HTTP_PORT to another port and retry."
  fi
}

create_kiban_directories() {
  mkdir -p \
    "${KIBAN_HOME}/bin" \
    "${KIBAN_HOME}/config" \
    "${KIBAN_HOME}/database" \
    "${KIBAN_HOME}/plugins" \
    "${KIBAN_HOME}/logs" \
    "${KIBAN_HOME}/cache" \
    "${KIBAN_RUNTIME_DIR}"
}

generate_secret() {
  if command_exists openssl; then
    openssl rand -hex 32
    return 0
  fi

  if command_exists sha256sum; then
    date +%s | sha256sum | awk '{print $1}'
    return 0
  fi

  date +%s | shasum -a 256 | awk '{print $1}'
}

write_runtime_environment() {
  secret="$(generate_secret)"
  cat > "${KIBAN_ENV_FILE}" <<ENV
KIBAN_VERSION=${KIBAN_VERSION}
KIBAN_HTTP_PORT=${KIBAN_HTTP_PORT}
KIBAN_HOME=${KIBAN_HOME}
KIBAN_USER_HOME=${KIBAN_USER_HOME}
KIBAN_SECRET=${secret}
ENV
  chmod 600 "${KIBAN_ENV_FILE}"
}

download_core_compose() {
  ensure_curl
  info "Downloading Kiban core runtime compose from ${KIBAN_COMPOSE_URL}..."
  curl -fsSL "${KIBAN_COMPOSE_URL}" -o "${KIBAN_COMPOSE_FILE}"
}

resolve_kiban_version() {
  if [ -n "${KIBAN_VERSION}" ]; then
    return
  fi

  ensure_curl
  info "Resolving Kiban version from ${KIBAN_VERSION_URL}..."
  KIBAN_VERSION="$(curl -fsSL "${KIBAN_VERSION_URL}" | tr -d '\r\n' | sed 's/^v//')"
  [ -n "${KIBAN_VERSION}" ] || fail "Could not resolve Kiban version from ${KIBAN_VERSION_URL}."
}

start_kiban() {
  info "Starting Kiban v${KIBAN_VERSION}..."
  docker compose --env-file "${KIBAN_ENV_FILE}" -f "${KIBAN_COMPOSE_FILE}" up -d
}

host_address() {
  if command_exists hostname; then
    address="$(hostname -I 2>/dev/null | awk '{print $1}')"
    if [ -n "${address}" ]; then
      printf '%s' "${address}"
      return 0
    fi
  fi

  printf '%s' "localhost"
}

install_cli() {
  cli_dest="${KIBAN_HOME}/bin/kiban"

  mkdir -p "${KIBAN_HOME}/bin"

  ensure_curl
  info "Downloading Kiban CLI from ${KIBAN_CLI_URL}..."
  curl -fsSL "${KIBAN_CLI_URL}" -o "${cli_dest}"

  chmod +x "${cli_dest}"
  info "CLI installed at ${cli_dest}"

  # Ensure ~/.kiban/bin is in PATH
  ensure_path
}

ensure_path() {
  if [ "${KIBAN_HOME}" != "${HOME}/.kiban" ]; then
    warn "Custom KIBAN_HOME detected. Add ${KIBAN_HOME}/bin to PATH manually if needed."
    return
  fi

  shell_name="$(basename "${SHELL:-/bin/sh}")"
  rc_file=""

  case "${shell_name}" in
    bash)
      if [ -r "${HOME}/.bashrc" ]; then
        rc_file="${HOME}/.bashrc"
      elif [ -r "${HOME}/.bash_profile" ]; then
        rc_file="${HOME}/.bash_profile"
      fi
      ;;
    zsh)
      rc_file="${HOME}/.zshrc"
      ;;
    *)
      if [ -r "${HOME}/.profile" ]; then
        rc_file="${HOME}/.profile"
      fi
      ;;
  esac

  if [ -z "${rc_file}" ]; then
    warn "Could not detect shell profile. Add ${KIBAN_HOME}/bin to your PATH manually."
    return
  fi

  # Check if already in PATH
  case ":${PATH}:" in
    *":${KIBAN_HOME}/bin:"*) return ;;
  esac

  # Check if already in rc_file
  if grep -qF "${KIBAN_HOME}/bin" "${rc_file}" 2>/dev/null; then
    return
  fi

  printf '\n# Kiban CLI\nexport PATH="%s/bin:$PATH"\n' "${KIBAN_HOME}" >> "${rc_file}"
  info "Added ${KIBAN_HOME}/bin to PATH in ${rc_file}"
  info "Run 'source ${rc_file}' or open a new terminal to use 'kiban'."
}

print_success() {
  cat <<MSG

Kiban v${KIBAN_VERSION} installed successfully.

Open Kiban:
http://$(host_address):${KIBAN_HTTP_PORT}

CLI:
  kiban --help

Local data directory:
${KIBAN_HOME}
MSG
}

main() {
  check_supported_os
  check_supported_architecture
  ensure_docker
  ensure_docker_compose
  ensure_port_available "${KIBAN_HTTP_PORT}"
  create_kiban_directories
  resolve_kiban_version
  write_runtime_environment
  download_core_compose
  install_cli
  start_kiban
  print_success
}

main "$@"
