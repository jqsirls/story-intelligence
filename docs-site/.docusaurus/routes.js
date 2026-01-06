import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '3d7'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '3c7'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '4fb'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '4bc'),
            routes: [
              {
                path: '/docs/api/authentication',
                component: ComponentCreator('/docs/api/authentication', '733'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/quickstart',
                component: ComponentCreator('/docs/api/quickstart', '7bf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/reference',
                component: ComponentCreator('/docs/api/reference', 'a17'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/category/tutorial---basics',
                component: ComponentCreator('/docs/category/tutorial---basics', '20e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/category/tutorial---extras',
                component: ComponentCreator('/docs/category/tutorial---extras', '9ad'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/education/classroom-setup',
                component: ComponentCreator('/docs/education/classroom-setup', '275'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/examples/basic-integration',
                component: ComponentCreator('/docs/examples/basic-integration', '82c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/getting-started/introduction',
                component: ComponentCreator('/docs/getting-started/introduction', '314'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/internal/sales/pricing-strategy',
                component: ComponentCreator('/docs/internal/sales/pricing-strategy', '8e1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '61d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/partners/overview',
                component: ComponentCreator('/docs/partners/overview', 'a18'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/pricing/api-platform',
                component: ComponentCreator('/docs/pricing/api-platform', 'a05'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/pricing/overview',
                component: ComponentCreator('/docs/pricing/overview', '78d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/sdks/web',
                component: ComponentCreator('/docs/sdks/web', '216'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/tutorial-basics/congratulations',
                component: ComponentCreator('/docs/tutorial-basics/congratulations', '458'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/tutorial-basics/create-a-blog-post',
                component: ComponentCreator('/docs/tutorial-basics/create-a-blog-post', '108'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/tutorial-basics/create-a-document',
                component: ComponentCreator('/docs/tutorial-basics/create-a-document', '8fc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/tutorial-basics/create-a-page',
                component: ComponentCreator('/docs/tutorial-basics/create-a-page', '951'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/tutorial-basics/deploy-your-site',
                component: ComponentCreator('/docs/tutorial-basics/deploy-your-site', '4f5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/tutorial-basics/markdown-features',
                component: ComponentCreator('/docs/tutorial-basics/markdown-features', 'b05'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/tutorial-extras/manage-docs-versions',
                component: ComponentCreator('/docs/tutorial-extras/manage-docs-versions', '978'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/tutorial-extras/translate-your-site',
                component: ComponentCreator('/docs/tutorial-extras/translate-your-site', 'f9a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/white-label/overview',
                component: ComponentCreator('/docs/white-label/overview', 'cc6'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
