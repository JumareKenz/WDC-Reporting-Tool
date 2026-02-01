import { useState } from 'react';
import { Plus, Edit2, Rocket, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { useForms, useDeployForm } from '../hooks/useStateData';
import FormBuilder from '../components/state/FormBuilder';

const StatusBadge = ({ status }) => {
  const styles = {
    DRAFT: 'bg-neutral-100 text-neutral-700',
    DEPLOYED: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

const StateFormsPage = () => {
  const { data: forms = [], isLoading, refetch } = useForms();
  const deployMutation = useDeployForm();
  const [builderForm, setBuilderForm] = useState(null);
  const [deployConfirmId, setDeployConfirmId] = useState(null);

  const draftCount = forms.filter(f => f.status === 'DRAFT').length;
  const deployedCount = forms.filter(f => f.status === 'DEPLOYED').length;
  const archivedCount = forms.filter(f => f.status === 'ARCHIVED').length;

  const handleDeploy = async (formId) => {
    try {
      await deployMutation.mutateAsync(formId);
      setDeployConfirmId(null);
      refetch();
    } catch (e) {
      alert(e.message || 'Deploy failed');
      setDeployConfirmId(null);
    }
  };

  const handleBuilderSave = () => {
    setBuilderForm(null);
    refetch();
  };

  if (isLoading) {
    return <div className="p-8 text-center text-neutral-500">Loading forms...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50/30">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Form Builder</h1>
            <p className="text-sm text-neutral-600 mt-1">Create and manage report forms for WDC Secretaries</p>
          </div>
          <button
            onClick={() => setBuilderForm({ name: '', description: '', definition: { sections: [], fields: [] }, status: 'DRAFT' })}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> New Form
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Draft', count: draftCount, icon: FileText, color: 'text-neutral-600 bg-neutral-50' },
            { label: 'Deployed', count: deployedCount, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
            { label: 'Archived', count: archivedCount, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
          ].map(({ label, count, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{count}</p>
                <p className="text-xs text-neutral-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Forms Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {forms.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              No forms yet. Click "New Form" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Version</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Deployed</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form) => (
                    <tr key={form.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{form.name}</p>
                        {form.description && <p className="text-xs text-neutral-500 mt-0.5">{form.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">v{form.version}</td>
                      <td className="px-4 py-3"><StatusBadge status={form.status} /></td>
                      <td className="px-4 py-3 text-neutral-500 text-xs">
                        {form.deployed_at ? new Date(form.deployed_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setBuilderForm(form)}
                            className="p-1.5 rounded text-neutral-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          {form.status === 'DRAFT' && (
                            deployConfirmId === form.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeploy(form.id)}
                                  className="text-xs px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeployConfirmId(null)}
                                  className="text-xs px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeployConfirmId(form.id)}
                                className="p-1.5 rounded text-neutral-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                                title="Deploy"
                              >
                                <Rocket size={16} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* FormBuilder full-screen overlay */}
      {builderForm !== null && (
        <FormBuilder
          form={builderForm}
          onSave={handleBuilderSave}
          onClose={() => setBuilderForm(null)}
        />
      )}
    </div>
  );
};

export default StateFormsPage;
