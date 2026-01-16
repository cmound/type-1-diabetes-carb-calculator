import { storage } from '../storage';
import { useEffect, useState } from 'react';
import type { Template } from '../types/template';

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateItems, setNewTemplateItems] = useState<Template['items']>([{ name: '', carbs: 0 }]);

  useEffect(() => {
    async function loadTemplates() {
      const data = await storage.listTemplates();
      setTemplates(data);
    }
    loadTemplates();
  }, []);

  const handleAddTemplate = async () => {
    if (!newTemplateName.trim()) return;

    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: newTemplateName,
      items: newTemplateItems,
    };

    await storage.addTemplate(newTemplate);
    setTemplates(await storage.listTemplates());
    setNewTemplateName('');
    setNewTemplateItems([{ name: '', carbs: 0 }]);
  };

  const handleDeleteTemplate = async (id: string) => {
    await storage.deleteTemplate(id);
    setTemplates(await storage.listTemplates());
  };

  return (
    <div>
      <h2>Templates</h2>
      <div className="surface">
        <p>Save and manage your meal templates here. Create reusable entries for frequently eaten meals.</p>

        <div>
          <h3>New Template</h3>
          <input
            type="text"
            placeholder="Template Name"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
          />
          <h4>Items</h4>
          {newTemplateItems.map((item, index) => (
            <div key={index}>
              <input
                type="text"
                placeholder="Item Name"
                value={item.name}
                onChange={(e) => {
                  const updatedItems = [...newTemplateItems];
                  updatedItems[index].name = e.target.value;
                  setNewTemplateItems(updatedItems);
                }}
              />
              <input
                type="number"
                placeholder="Carbs"
                value={item.carbs}
                onChange={(e) => {
                  const updatedItems = [...newTemplateItems];
                  updatedItems[index].carbs = parseFloat(e.target.value) || 0;
                  setNewTemplateItems(updatedItems);
                }}
              />
            </div>
          ))}
          <button
            onClick={() => setNewTemplateItems([...newTemplateItems, { name: '', carbs: 0 }])}
          >
            Add Item
          </button>
          <button onClick={handleAddTemplate}>Save Template</button>
        </div>

        <h3>Saved Templates</h3>
        <ul>
          {templates.map((template) => (
            <li key={template.id}>
              <span>{template.name}</span>
              <button onClick={() => handleDeleteTemplate(template.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
