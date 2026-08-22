/** Applies or removes instance domain routing on the Kiban core runtime. */
export interface InstanceDomainApplier {
  applyInstanceDomain(domain: string): Promise<boolean>;
}
