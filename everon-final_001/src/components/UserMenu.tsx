import { useState } from 'react';
import { logout } from '../services/authService';

interface UserMenuProps {
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  onLogout: () => void;
  onLanguageSettings?: () => void;
  onShowOnboarding?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, onLanguageSettings, onShowOnboarding }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    onLogout();
    setShowMenu(false);
  };

  const handleLanguageSettings = () => {
    if (onLanguageSettings) {
      onLanguageSettings();
      setShowMenu(false);
    }
  };

  const handleShowOnboarding = () => {
    if (onShowOnboarding) {
      onShowOnboarding();
      setShowMenu(false);
    }
  };

  return (
    <div className="user-menu-container">
      <button 
        className="user-avatar-btn"
        onClick={() => setShowMenu(!showMenu)}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || 'User'} />
        ) : (
          <div className="user-avatar-placeholder">
            {(user.displayName || user.email || 'U')[0].toUpperCase()}
          </div>
        )}
      </button>

      {showMenu && (
        <>
          <div className="user-menu-overlay" onClick={() => setShowMenu(false)} />
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <div className="user-menu-name">{user.displayName || 'User'}</div>
              <div className="user-menu-email">{user.email}</div>
            </div>
            
            <div className="user-menu-divider" />
            
            {onLanguageSettings && (
              <button className="user-menu-item" onClick={handleLanguageSettings}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Language Settings
              </button>
            )}
            
            {onShowOnboarding && (
              <button className="user-menu-item" onClick={handleShowOnboarding}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                View Tutorial
              </button>
            )}
            
            <button className="user-menu-item" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
