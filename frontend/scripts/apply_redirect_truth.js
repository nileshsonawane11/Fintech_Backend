import fs from 'fs';
import path from 'path';

const appPath = path.resolve('src/App.jsx');
let appContent = fs.readFileSync(appPath, 'utf8');

// Normalize line endings to find and replace
const targetProtected = `const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }
  return children;
};`;

const replProtected = `const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }
  return children;
};`;

const targetMgrProtected = `const ManagerProtectedRoute = ({ children }) => {
  const { isManagerAuthenticated, managerUser } = useAuth();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('finedge_manager_token') : null;
  if (!managerUser && !token) {
    return <Navigate to="/manager/login" replace />;
  }
  return children;
};`;

const replMgrProtected = `const ManagerProtectedRoute = ({ children }) => {
  const { isManagerAuthenticated, managerUser } = useAuth();
  const location = useLocation();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('finedge_manager_token') : null;
  if (!managerUser && !token) {
    return <Navigate to="/manager/login" state={{ from: location }} replace />;
  }
  return children;
};`;

appContent = appContent.replace(targetProtected, replProtected);
appContent = appContent.replace(targetProtected.replace(/\n/g, '\r\n'), replProtected.replace(/\n/g, '\r\n'));
appContent = appContent.replace(targetMgrProtected, replMgrProtected);
appContent = appContent.replace(targetMgrProtected.replace(/\n/g, '\r\n'), replMgrProtected.replace(/\n/g, '\r\n'));
fs.writeFileSync(appPath, appContent, 'utf8');
console.log('Updated src/App.jsx successfully');

// Now update PortalLoginPage.jsx
const portalLoginPath = path.resolve('src/pages/portal/PortalLoginPage.jsx');
let portalLoginContent = fs.readFileSync(portalLoginPath, 'utf8');

if (!portalLoginContent.includes('useLocation')) {
  portalLoginContent = portalLoginContent.replace("import { useNavigate, Link } from 'react-router-dom';", "import { useNavigate, useLocation, Link } from 'react-router-dom';");
  portalLoginContent = portalLoginContent.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n  const location = useLocation();');
}

// Replace hardcoded navigate('/portal') with return target
portalLoginContent = portalLoginContent.replaceAll("navigate('/portal')", "navigate(location.state?.from?.pathname || location.state?.from || '/portal')");
fs.writeFileSync(portalLoginPath, portalLoginContent, 'utf8');
console.log('Updated src/pages/portal/PortalLoginPage.jsx successfully');

// Now update ManagerLoginPage.jsx
const mgrLoginPath = path.resolve('src/pages/manager/ManagerLoginPage.jsx');
let mgrLoginContent = fs.readFileSync(mgrLoginPath, 'utf8');

if (!mgrLoginContent.includes('useLocation')) {
  mgrLoginContent = mgrLoginContent.replace("import { Link, useNavigate } from 'react-router-dom';", "import { Link, useNavigate, useLocation } from 'react-router-dom';");
  mgrLoginContent = mgrLoginContent.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n  const location = useLocation();');
}

if (!mgrLoginContent.includes('hasSectionAccess')) {
  mgrLoginContent = mgrLoginContent.replace("import { getFirstQueueForRole } from '../../services/managerBridge.js';", "import { getFirstQueueForRole, hasSectionAccess } from '../../services/managerBridge.js';");
}

const targetMgrTarget = `      const role = res?.managerUser?.role;
      const target = getFirstQueueForRole(role);
      navigate(target);`;

const replMgrTarget = `      const role = res?.managerUser?.role;
      const defaultTarget = getFirstQueueForRole(role);
      const fromPath = location.state?.from?.pathname;
      const fromSection = fromPath?.replace(/^\\/manager\\/?/, '');
      const target = (fromPath && fromPath.startsWith('/manager') && fromSection && hasSectionAccess(fromSection, res?.managerUser))
        ? fromPath
        : defaultTarget;
      navigate(target);`;

mgrLoginContent = mgrLoginContent.replace(targetMgrTarget, replMgrTarget);
mgrLoginContent = mgrLoginContent.replace(targetMgrTarget.replace(/\n/g, '\r\n'), replMgrTarget.replace(/\n/g, '\r\n'));
fs.writeFileSync(mgrLoginPath, mgrLoginContent, 'utf8');
console.log('Updated src/pages/manager/ManagerLoginPage.jsx successfully');
