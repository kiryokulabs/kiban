import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProjectManager, ProjectNotFoundError, ProjectValidationError } from '@kiban/core';
import { ProjectService } from './project.service';

const details = {
  project: { id: 'project-1', name: 'CrossMetrics', description: 'Analytics', createdAt: new Date('2026-07-29T12:00:00.000Z'), updatedAt: new Date('2026-07-29T12:00:00.000Z') },
  environments: [
    { id: 'environment-1', projectId: 'project-1', name: 'Development', slug: 'development', type: 'system' as const, description: null, createdAt: new Date('2026-07-29T12:00:00.000Z'), updatedAt: new Date('2026-07-29T12:00:00.000Z') }
  ]
};

const createService = (
  manager: Partial<ProjectManager>,
  installedServices?: { list: (projectId: string, environmentId: string) => Promise<readonly { readonly id: string }[]> },
  imageStorage?: { save: (projectId: string, image: { readonly contentType: string; readonly data: Buffer }) => Promise<void>; find: (projectId: string) => Promise<{ readonly contentType: string; readonly data: Buffer } | null>; delete: (projectId: string) => Promise<void> }
) => new ProjectService(manager as ProjectManager, installedServices, imageStorage);

describe('API ProjectService', () => {
  it('creates a project and maps environments to DTOs', async () => {
    const createProject = vi.fn(async () => details);
    const service = createService({ createProject });

    await expect(service.create({ name: 'CrossMetrics', description: 'Analytics' })).resolves.toEqual({
      id: 'project-1',
      name: 'CrossMetrics',
      description: 'Analytics',
      createdAt: details.project.createdAt.toISOString(),
      updatedAt: details.project.updatedAt.toISOString(),
      environments: [{ id: 'environment-1', projectId: 'project-1', name: 'Development', slug: 'development', type: 'system', description: null, status: 'Empty', createdAt: details.environments[0]!.createdAt.toISOString(), updatedAt: details.environments[0]!.updatedAt.toISOString() }]
    });
    expect(createProject).toHaveBeenCalledWith({ name: 'CrossMetrics', description: 'Analytics' });
  });

  it('rejects unknown create payload fields', async () => {
    const service = createService({ createProject: vi.fn() });
    await expect(service.create({ name: 'CrossMetrics', extra: true })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps validation errors to bad request', async () => {
    const service = createService({ createProject: vi.fn(async () => { throw new ProjectValidationError('Invalid project name.'); }) });
    await expect(service.create({ name: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists project summaries', async () => {
    const service = createService({ listProjects: vi.fn(async () => [{ project: details.project, environmentCount: 3, serviceCount: 2, runningServiceCount: 1, healthStatus: 'degraded' as const }]) });
    await expect(service.list()).resolves.toEqual([{ id: 'project-1', name: 'CrossMetrics', description: 'Analytics', environmentCount: 3, serviceCount: 2, runningServiceCount: 1, healthStatus: 'degraded', createdAt: details.project.createdAt.toISOString(), updatedAt: details.project.updatedAt.toISOString() }]);
  });

  it('gets a project by id', async () => {
    const service = createService({ getProject: vi.fn(async () => details) });
    await expect(service.get('project-1')).resolves.toMatchObject({ id: 'project-1', environments: [{ name: 'Development', status: 'Empty' }] });
  });

  it('maps missing project to not found', async () => {
    const service = createService({ getProject: vi.fn(async () => { throw new ProjectNotFoundError(); }) });
    await expect(service.get('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a project', async () => {
    const updateProject = vi.fn(async () => ({ ...details, project: { ...details.project, name: 'Updated', description: null } }));
    const service = createService({ updateProject });
    await expect(service.update('project-1', { name: 'Updated', description: null })).resolves.toMatchObject({ id: 'project-1', name: 'Updated', description: null });
    expect(updateProject).toHaveBeenCalledWith('project-1', { name: 'Updated', description: null });
  });

  it('gets project settings with project stats', async () => {
    const getProject = vi.fn(async () => ({
      ...details,
      environments: [
        details.environments[0]!,
        { id: 'environment-2', projectId: 'project-1', name: 'Production', slug: 'production', type: 'system' as const, description: null, createdAt: details.project.createdAt, updatedAt: details.project.updatedAt }
      ]
    }));
    const list = vi.fn(async (_projectId: string, environmentId: string) => environmentId === 'environment-1' ? [{ id: 'service-1' }, { id: 'service-2' }] : [{ id: 'service-3' }]);
    const service = createService({ getProject }, { list });

    await expect(service.getSettings('project-1')).resolves.toMatchObject({
      id: 'project-1',
      name: 'CrossMetrics',
      description: 'Analytics',
      environmentCount: 2,
      serviceCount: 3,
      hasImage: false
    });
  });

  it('saves a project image after validating the project exists', async () => {
    const getProject = vi.fn(async () => details);
    const save = vi.fn(async () => undefined);
    const service = createService({ getProject }, undefined, { save, find: vi.fn(), delete: vi.fn() });

    await service.saveImage('project-1', { contentType: 'image/png', dataBase64: Buffer.from('image').toString('base64') });

    expect(getProject).toHaveBeenCalledWith('project-1');
    expect(save).toHaveBeenCalledWith('project-1', { contentType: 'image/png', data: Buffer.from('image') });
  });

  it('rejects unsupported project image types', async () => {
    const service = createService({ getProject: vi.fn(async () => details) }, undefined, { save: vi.fn(), find: vi.fn(), delete: vi.fn() });

    await expect(service.saveImage('project-1', { contentType: 'text/plain', dataBase64: Buffer.from('nope').toString('base64') })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found when a project image does not exist', async () => {
    const service = createService({ getProject: vi.fn(async () => details) }, undefined, { save: vi.fn(), find: vi.fn(async () => null), delete: vi.fn() });

    await expect(service.getImage('project-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an existing project image', async () => {
    const image = { contentType: 'image/webp', data: Buffer.from('image') };
    const service = createService({ getProject: vi.fn(async () => details) }, undefined, { save: vi.fn(), find: vi.fn(async () => image), delete: vi.fn() });

    await expect(service.getImage('project-1')).resolves.toEqual(image);
  });

  it('deletes a project', async () => {
    const deleteProject = vi.fn(async () => undefined);
    const service = createService({ deleteProject });
    await service.delete('project-1');
    expect(deleteProject).toHaveBeenCalledWith('project-1');
  });

  it('deletes project image storage before deleting the project record', async () => {
    const calls: string[] = [];
    const deleteProject = vi.fn(async () => { calls.push('project'); });
    const deleteImageStorage = vi.fn(async () => { calls.push('image-storage'); });
    const service = createService({ deleteProject }, undefined, { save: vi.fn(), find: vi.fn(), delete: deleteImageStorage });

    await service.delete('project-1');

    expect(deleteImageStorage).toHaveBeenCalledWith('project-1');
    expect(deleteProject).toHaveBeenCalledWith('project-1');
    expect(calls).toEqual(['image-storage', 'project']);
  });

  it('does not delete a project while one of its environments has installed services', async () => {
    const getProject = vi.fn(async () => ({
      ...details,
      environments: [
        details.environments[0]!,
        { id: 'environment-2', projectId: 'project-1', name: 'Production', slug: 'production', type: 'system' as const, description: null, createdAt: details.project.createdAt, updatedAt: details.project.updatedAt }
      ]
    }));
    const deleteProject = vi.fn(async () => undefined);
    const list = vi.fn(async (_projectId: string, environmentId: string) => environmentId === 'environment-1' ? [] : [{ id: 'service-1' }]);
    const service = createService({ getProject, deleteProject }, { list });

    await expect(service.delete('project-1')).rejects.toBeInstanceOf(BadRequestException);

    expect(list).toHaveBeenCalledWith('project-1', 'environment-1');
    expect(list).toHaveBeenCalledWith('project-1', 'environment-2');
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it('gets project environments', async () => {
    const service = createService({ listEnvironments: vi.fn(async () => details.environments) });
    await expect(service.listEnvironments('project-1')).resolves.toEqual([{ id: 'environment-1', projectId: 'project-1', name: 'Development', slug: 'development', type: 'system', description: null, status: 'Empty', createdAt: details.environments[0]!.createdAt.toISOString(), updatedAt: details.environments[0]!.updatedAt.toISOString() }]);
  });
});

describe('API ProjectService environments', () => {
  it('creates a custom environment', async () => {
    const createEnvironment = vi.fn(async () => ({ id: 'environment-2', projectId: 'project-1', name: 'QA', slug: 'qa', type: 'custom' as const, description: 'Quality checks', createdAt: details.project.createdAt, updatedAt: details.project.updatedAt }));
    const service = createService({ createEnvironment });
    await expect(service.createEnvironment('project-1', { name: 'QA', description: 'Quality checks' })).resolves.toMatchObject({ name: 'QA', type: 'custom', description: 'Quality checks', status: 'Empty' });
    expect(createEnvironment).toHaveBeenCalledWith('project-1', { name: 'QA', description: 'Quality checks' });
  });

  it('rejects unknown environment payload fields', async () => {
    const service = createService({ createEnvironment: vi.fn() });
    await expect(service.createEnvironment('project-1', { name: 'QA', description: null, extra: true })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes an environment', async () => {
    const deleteEnvironment = vi.fn(async () => undefined);
    const service = createService({ deleteEnvironment });
    await service.deleteEnvironment('project-1', 'environment-1');
    expect(deleteEnvironment).toHaveBeenCalledWith('project-1', 'environment-1');
  });
});
