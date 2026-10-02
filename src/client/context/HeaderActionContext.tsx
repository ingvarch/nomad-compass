import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface HeaderAction {
  label: string;
  onClick?: () => void;
  to?: string;
}

interface HeaderActionContextType {
  action: HeaderAction | null;
  setAction: (action: HeaderAction | null) => void;
}

const HeaderActionContext = createContext<HeaderActionContextType>({
  action: null,
  setAction: () => {},
});

export const HeaderActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [action, setActionState] = useState<HeaderAction | null>(null);

  const setAction = useCallback((newAction: HeaderAction | null) => {
    setActionState((prev) => {
      if (prev === newAction) return prev;
      if (!prev && !newAction) return null;
      if (
        prev &&
        newAction &&
        prev.label === newAction.label &&
        prev.to === newAction.to &&
        prev.onClick === newAction.onClick
      ) {
        return prev;
      }
      return newAction;
    });
  }, []);

  return (
    <HeaderActionContext.Provider value={{ action, setAction }}>
      {children}
    </HeaderActionContext.Provider>
  );
};

export function useHeaderAction(action: HeaderAction | null) {
  const { setAction } = useContext(HeaderActionContext);
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    setAction(actionRef.current);
    return () => setAction(null);
  }, [action?.label, action?.to, setAction]);
}

export function useCurrentHeaderAction(): HeaderAction | null {
  return useContext(HeaderActionContext).action;
}
