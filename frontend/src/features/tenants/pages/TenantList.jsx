import { useEffect, useState } from 'react';
import Modal from '../../../components/common/Modal';
import AssignAdminForm from '../components/AssignAdminForm';
import TenantTable from '../components/TenantTable';
import TenantStats from '../components/TenantStats';
import TenantDetails from './TenantDetails';
import ProjectList from '../../projects/pages/ProjectList';
import { tenantSchema, validationMessage } from '../../../validation/schemas';
import tenantService from '../tenant.service';
import { slugify } from '../../../utils/helpers';

export default function TenantList({ user, tenants, users, projects, setUsers, onRefresh }) {
  const [selected, setSelected] = useState(tenants[0]?.id || '');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const current = tenants.find((tenant) => tenant.id === selected);
  const tenantUsers = users.filter((item) => item.tenantId === selected);
  const tenantProjects = projects.filter((project) => project.tenant_id === selected);
  useEffect(() => {
    if (!selected && tenants[0]) setSelected(tenants[0].id);
  }, [selected, tenants]);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = tenantSchema.safeParse({
      name: form.get('name'),
      slug: slugify(form.get('slug')),
    });
    if (!result.success) {
      setError(validationMessage(result));
      return;
    }
    try {
      const created = await tenantService.create({
        ...result.data,
        adminUserId: form.get('adminUserId'),
      });
      setSelected(created.id);
      setOpen(false);
      await onRefresh();
      if (created.admin) {
        setUsers((currentUsers) =>
          currentUsers.map((item) =>
            item.id === created.admin.id
              ? {
                  ...item,
                  role: 'ADMIN',
                  tenantId: created.admin.tenant_id,
                  tenantName: created.name,
                }
              : item
          )
        );
      }
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Workspace administration</p>
          <h1>Tenants</h1>
          <p className="muted">
            Create tenants, assign their Admin, and manage projects within each workspace.
          </p>
        </div>
        <button className="primary-button" onClick={() => setOpen(true)}>
          <span>＋</span> Create tenant
        </button>
      </section>
      {error && <p className="banner-error">{error}</p>}
      <div className="tenant-layout">
        <TenantTable {...{ tenants, users, projects, selected }} onSelect={setSelected} />
        {current ? (
          <TenantDetails>
            <div className="section-heading">
              <div>
                <h2>{current.name}</h2>
                <TenantStats
                  admins={tenantUsers.filter((item) => item.role === 'ADMIN')}
                  projects={tenantProjects}
                />
              </div>
            </div>
            <ProjectList
              user={user}
              projects={projects}
              tenants={tenants}
              tenantId={current.id}
              onRefresh={onRefresh}
            />
          </TenantDetails>
        ) : (
          <div className="empty-state">Create a tenant to get started.</div>
        )}
      </div>
      {open && (
        <Modal title="Create tenant and assign Admin" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <label>
              Tenant name
              <input name="name" required />
            </label>
            <label>
              Tenant slug
              <input name="slug" required />
            </label>
            <label>
              Assign Admin
              <AssignAdminForm users={users} />
            </label>
            <button className="primary-button" type="submit">
              Create tenant and Admin
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
