import { StrictMode } from 'react';
import { StaticRouter } from 'react-router-dom';
import { prerender } from 'react-dom/static';
import App from './App';
import { publicRoutes } from './seo/routes';
import { routeHead } from './seo/head';
import { structuredData } from './seo/structuredData';

export { publicRoutes, routeHead, structuredData };
export async function render(path: string) {
  const { prelude } = await prerender(<StrictMode><StaticRouter location={path}><App /></StaticRouter></StrictMode>);
  return new Response(prelude).text();
}
