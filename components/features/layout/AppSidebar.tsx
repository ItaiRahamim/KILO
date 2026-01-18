'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Package,
  LayoutDashboard,
  FileText,
  ShoppingCart,
  TruckIcon,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  Bell,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@/types';

interface AppSidebarProps {
  userRole: UserRole;
  userName: string;
  userEmail: string;
}

// Define navigation items based on role
const getNavigationItems = (role: UserRole) => {
  const baseItems = [
    {
      name: 'Dashboard',
      href: `/dashboard/${role}`,
      icon: LayoutDashboard,
      roles: ['importer', 'supplier', 'broker'] as UserRole[],
    },
  ];

  const roleSpecificItems = {
    importer: [
      { name: 'All Orders', href: '/dashboard/importer/orders', icon: ShoppingCart },
      { name: 'Documents', href: '/dashboard/importer/documents', icon: FileText },
      { name: 'Suppliers', href: '/dashboard/importer/suppliers', icon: Users },
      { name: 'Analytics', href: '/dashboard/importer/analytics', icon: BarChart3 },
      { name: 'Notifications', href: '/dashboard/importer/notifications', icon: Bell },
    ],
    supplier: [
      { name: 'My Orders', href: '/dashboard/supplier/orders', icon: ShoppingCart },
      { name: 'New Order', href: '/dashboard/supplier/orders/new', icon: Package },
      { name: 'Documents', href: '/dashboard/supplier/documents', icon: FileText },
      { name: 'Notifications', href: '/dashboard/supplier/notifications', icon: Bell },
    ],
    broker: [
      { name: 'Shipments', href: '/dashboard/broker/shipments', icon: TruckIcon },
      { name: 'Documents', href: '/dashboard/broker/documents', icon: FileCheck },
      { name: 'Notifications', href: '/dashboard/broker/notifications', icon: Bell },
    ],
  };

  return [...baseItems, ...roleSpecificItems[role]];
};

export function AppSidebar({ userRole, userName, userEmail }: AppSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navigationItems = getNavigationItems(userRole);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch (error) {
      toast.error('Error logging out');
      console.error('Logout error:', error);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'importer':
        return 'bg-blue-100 text-blue-700';
      case 'supplier':
        return 'bg-green-100 text-green-700';
      case 'broker':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">
            <span className="text-purple-600">Kilo</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">
                <span className="text-purple-600">Kilo</span>
              </span>
            </div>
          </div>

          {/* User Info */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-semibold text-sm">
                  {userName.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                <span
                  className={cn(
                    'inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    getRoleBadgeColor(userRole)
                  )}
                >
                  {getRoleLabel(userRole)}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 p-3 space-y-1">
            <Link
              href={`/dashboard/${userRole}/settings`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

