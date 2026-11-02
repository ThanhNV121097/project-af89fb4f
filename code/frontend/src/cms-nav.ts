import type { NavGroup } from "./components/DashboardLayout";

/** The CMS's two areas. One shop, one person: no second role, no second menu. */
export const cmsNav: readonly NavGroup[] = [
  {
    heading: "The shelf",
    items: [
      { to: "/cms/products", label: "Products" },
      { to: "/cms/products/new", label: "Add a product" },
    ],
  },
];
