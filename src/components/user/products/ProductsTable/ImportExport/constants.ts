export const PRODUCTS_SHEET_NAME = "products";
export const PARAMS_SHEET_NAME = "params";
export const LOOKUPS_SHEET_NAME = "lookups";
export const META_SHEET_NAME = "meta";

export const PARAMS_TECH_COLUMNS = ["product_id", "external_id", "param_name", "param_value"] as const;

export const LOOKUPS_EXPORT_COLUMNS = ["type", "id", "name", "external_id", "supplier_id"] as const;

export const META_EXPORT_COLUMNS = ["key", "value"] as const;
