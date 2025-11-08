import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface Question {
  id: string;
  text: string;
  required: boolean;
  type?: string;
}

interface TemplateSchema {
  title: string;
  description: string;
  type: string;
  fields: Question[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  is_global: boolean;
  organization_id: string | null;
  category: string;
  schema_json: TemplateSchema;
  usage_count: number;
  created_at: string;
}

interface TemplateLibraryProps {
  apiUrl: string;
  userId: string;
  onSelectTemplate: (templateId: string, templateName: string) => void;
  onCreateNew: () => void;
}

export function TemplateLibrary({ apiUrl, userId, onSelectTemplate, onCreateNew }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'global' | 'organization'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ templateId: string; templateName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [filter, userId]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        user_id: userId,
        type: filter
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${apiUrl}/templates?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTemplates();
  };

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      const response = await fetch(`${apiUrl}/templates/${deleteConfirm.templateId}?user_id=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }

      // Refresh templates
      await fetchTemplates();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setSelectedTemplate(null);
  };

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template.id, template.name);
  };

  const handleMenuClick = (menuId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openMenuId === menuId) {
      setOpenMenuId(null);
      return;
    }
    setOpenMenuId(menuId);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.actions-menu, .btn-action')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const handleClone = async (template: Template) => {
    setOpenMenuId(null);
    
    try {
      setError('');
      const response = await fetch(`${apiUrl}/templates/${template.id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          new_name: `${template.name} (Copy)`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to duplicate template');
      }

      const result = await response.json();
      
      // Show success message
      alert(`✅ Template duplicated successfully!\n\nNew template: "${result.template.name}"`);
      
      // Refresh templates to show the new copy
      await fetchTemplates();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate template';
      setError(errorMessage);
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    const categoryMap: Record<string, string> = {
      general: 'badge-general',
      management: 'badge-management',
      technical: 'badge-technical',
      sales: 'badge-sales',
      entry_level: 'badge-entry',
      executive: 'badge-executive',
      academic: 'badge-academic',
      custom: 'badge-custom',
    };
    return categoryMap[category] || 'badge-default';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: 'General',
      management: 'Management',
      technical: 'Technical',
      sales: 'Sales',
      entry_level: 'Entry Level',
      executive: 'Executive',
      academic: 'Academic',
      custom: 'Custom',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="template-library loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-library">
      <header className="template-library-header">
        <div className="header-content">
          <h2>📋 Select a Reference Template</h2>
          <p>Choose a template to get started, or create your own custom template</p>
        </div>
      </header>

      <div className="template-filters">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Templates ({templates.length})
          </button>
          <button
            className={`filter-btn ${filter === 'global' ? 'active' : ''}`}
            onClick={() => setFilter('global')}
          >
            🌍 Pre-Built
          </button>
          <button
            className={`filter-btn ${filter === 'organization' ? 'active' : ''}`}
            onClick={() => setFilter('organization')}
          >
            🏢 My Custom
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="btn-search">
            🔍 Search
          </button>
        </div>

        {onCreateNew && (
          <button onClick={onCreateNew} className="btn-create-template">
            + Create Custom Template
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchTemplates}>Try Again</button>
        </div>
      )}

      {templates.length === 0 && !loading && !error && (
        <div className="no-templates">
          <p>No templates found</p>
          {searchTerm && <p>Try adjusting your search terms</p>}
        </div>
      )}

      <div className="template-list-container">
        <table className="template-list-table">
          <thead>
            <tr>
              <th>Template Name</th>
              <th>Category</th>
              <th>Description</th>
              <th style={{ textAlign: 'center' }}>Questions</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id} className="template-list-row">
                <td>
                  <div className="template-name-cell-stacked">
                    <strong>{template.name}</strong>
                    {template.is_global && (
                      <span className="badge badge-global" style={{ fontSize: '10px', marginTop: '4px' }}>
                        Global
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${getCategoryBadgeClass(template.category)}`}>
                    {getCategoryLabel(template.category)}
                  </span>
                </td>
                <td>
                  <span 
                    className="template-description-cell"
                    title={template.description || 'No description available'}
                  >
                    {template.description || 'No description available'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <strong>{template.schema_json.fields.length}</strong>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                      onClick={(e) => handleMenuClick(template.id, e)}
                      className="btn-action"
                      style={{ background: '#6366f1', color: 'white' }}
                    >
                      ⋯
                    </button>
                    {openMenuId === template.id && (
                      <div className="actions-menu">
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            handleSelectTemplate(template);
                          }}
                          style={{ color: '#6366f1', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '8px' }}
                        >
                          ✓ Use This Template
                        </button>
                        <button
                          onClick={() => {
                            handleClone(template);
                          }}
                          style={{ color: '#2563eb' }}
                        >
                          📋 Duplicate Template
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            handlePreview(template);
                          }}
                          style={{ color: '#8b5cf6' }}
                        >
                          👁️ Preview Questions
                        </button>
                        {!template.is_global && (
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              setDeleteConfirm({ templateId: template.id, templateName: template.name });
                            }}
                            style={{ color: '#dc2626', borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '8px' }}
                          >
                            🗑️ Delete Template
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="modal-overlay" onClick={handleClosePreview}>
          <div className="modal-content template-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTemplate.name}</h2>
              <button onClick={handleClosePreview} className="btn-close">×</button>
            </div>

            <div className="modal-body">
              <div className="preview-metadata">
                <span className={`badge ${getCategoryBadgeClass(selectedTemplate.category)}`}>
                  {getCategoryLabel(selectedTemplate.category)}
                </span>
                {selectedTemplate.is_global && (
                  <span className="badge badge-global">Global Template</span>
                )}
              </div>

              <p className="preview-description">{selectedTemplate.description}</p>

              <div className="preview-questions">
                <h3>Questions ({selectedTemplate.schema_json.fields.length})</h3>
                
                {selectedTemplate.schema_json.fields.map((field, index) => (
                  <div key={field.id} className="preview-question">
                    <div className="question-number">{index + 1}.</div>
                    <div className="question-content">
                      <p className="question-text">{field.text}</p>
                      <div className="question-meta">
                        {field.required && (
                          <span className="badge badge-required">Required</span>
                        )}
                        <span className="badge badge-type">
                          {field.type === 'textarea' ? 'Long Answer' : 
                           field.type === 'scale' ? 'Rating Scale' : 'Short Answer'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={handleClosePreview} className="btn-secondary">
                Close
              </button>
              <button
                onClick={() => {
                  handleClosePreview();
                  handleSelectTemplate(selectedTemplate);
                }}
                className="btn-primary"
              >
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Template?"
          message={`Are you sure you want to delete "${deleteConfirm.templateName}"? This action cannot be undone.`}
          confirmText={deleting ? 'Deleting...' : 'Delete'}
          cancelText="Cancel"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          isDestructive={true}
        />
      )}
    </div>
  );
}

