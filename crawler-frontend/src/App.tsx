import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { routes } from './routes';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="layout">
        <BrowserRouter>
          <Routes>
            {routes.map(({ path, element, index }, i) => (
              <Route key={i} path={path} element={element} index={index} />
            ))}
          </Routes>
        </BrowserRouter>
      </main>
    </QueryClientProvider>
  );
}

export default App;
