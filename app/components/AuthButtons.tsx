'use client';

import { useState } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-nextjs';
import { LoginLink, LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components';

export function AuthButtons() {
  const { isAuthenticated, user } = useKindeAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex gap-4 items-center">
      {!isAuthenticated && (
        <LoginLink>
          <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-1 px-3 rounded">
            Log In
          </button>
        </LoginLink>
      )}
      {isAuthenticated && (
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 focus:outline-none"
          >
            {user?.picture && (
              <img
                src={user.picture}
                alt="User avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="text-sm text-white">{user?.given_name || user?.email}</span>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow-lg z-10">
              <a
                href="/dashboard"
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                My Dashboard
              </a>
              <a
                href="/billing"
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Manage Billing
              </a>
              <LogoutLink>
                <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100">
                  Log Out
                </button>
              </LogoutLink>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
