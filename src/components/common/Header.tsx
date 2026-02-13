import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) {
    return null;
  }

  const isHomePage = location.pathname === '/';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1
              className="text-2xl font-bold text-primary-600 cursor-pointer hover:text-primary-700 transition-colors"
              onClick={() => navigate('/')}
            >
              Společenské hry
            </h1>
            {user && (
              <span className="text-gray-600 dark:text-gray-400">
                {user.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isHomePage && (
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="sm"
              >
                Domů
              </Button>
            )}
            <Button
              onClick={logout}
              variant="secondary"
              size="sm"
            >
              Odhlásit se
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
