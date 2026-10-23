import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  ComponentPropsWithoutRef,
  MouseEvent,
} from 'react';

interface RouterContextType {
  path: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function normalizePath(rawPath: string): string {
  if (!rawPath) return '/';
  const clean = rawPath.split('?')[0].split('#')[0];
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean || '/';
}

function getInitialPath(): string {
  if (typeof window === 'undefined') return '/';
  // If hash routing is used (e.g., /#/research/publications)
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    return normalizePath(window.location.hash.slice(1));
  }
  return normalizePath(window.location.pathname);
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(getInitialPath);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(getInitialPath());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = (to: string, options?: { replace?: boolean }) => {
    const normalized = normalizePath(to);
    if (options?.replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    setPath(normalized);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextType {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}

export interface LinkProps extends ComponentPropsWithoutRef<'a'> {
  href: string;
  activeClassName?: string;
  key?: string;
}

export function Link({
  href,
  className = '',
  activeClassName = '',
  children,
  onClick,
  ...rest
}: LinkProps) {
  const { path, navigate } = useRouter();
  const normalizedHref = normalizePath(href);
  const isActive = path === normalizedHref;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (
      !e.defaultPrevented &&
      e.button === 0 && // Left click only
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.shiftKey &&
      href.startsWith('/')
    ) {
      e.preventDefault();
      if (path !== normalizedHref) {
        navigate(href);
      }
    }
  };

  const combinedClassName = `${className} ${isActive ? activeClassName : ''}`.trim();

  return (
    <a
      href={href}
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      className={combinedClassName}
      {...rest}
    >
      {children}
    </a>
  );
}
