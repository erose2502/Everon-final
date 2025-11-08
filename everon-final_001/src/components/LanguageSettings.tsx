import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { updateLanguagePreference } from '../services/authService';
import { SUPPORTED_LANGUAGES } from '../utils/languageUtils';

interface LanguageSettingsProps {
  user: User;
  currentLanguage: string;
  onClose: () => void;
  onLanguageChange: (language: string) => void;
}

const LanguageSettings: React.FC<LanguageSettingsProps> = ({
  user,
  currentLanguage,
  onClose,
  onLanguageChange
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      const result = await updateLanguagePreference(user.uid, selectedLanguage);
      
      if (result.success) {
        onLanguageChange(selectedLanguage);
        setSaveMessage('✓ Language preference saved!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setSaveMessage('❌ Failed to save preference');
      }
    } catch (error) {
      console.error('Error saving language:', error);
      setSaveMessage('❌ Error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="language-settings-overlay" onClick={onClose}>
      <div className="language-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="language-settings-header">
          <h2>Language Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="language-settings-content">
          <p className="language-settings-description">
            Choose your preferred language. Everon will always communicate with you in this language.
          </p>
          
          <div className="language-options">
            {Object.entries(SUPPORTED_LANGUAGES).map(([key, config]) => (
              <button
                key={key}
                className={`language-option ${selectedLanguage === key ? 'selected' : ''}`}
                onClick={() => setSelectedLanguage(key)}
              >
                <span className="language-flag">{config.name}</span>
                <span className="language-name">{config.code}</span>
                {selectedLanguage === key && <span className="checkmark">✓</span>}
              </button>
            ))}
          </div>
          
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('✓') ? 'success' : 'error'}`}>
              {saveMessage}
            </div>
          )}
        </div>
        
        <div className="language-settings-footer">
          <button className="cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={saving || selectedLanguage === currentLanguage}
          >
            {saving ? 'Saving...' : 'Save Preference'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;
