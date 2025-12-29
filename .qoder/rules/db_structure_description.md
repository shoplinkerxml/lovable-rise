---
trigger: manual
---

# 📦 Структура базы данных для системы импорта и управления товарами

## Общая информация

База данных предназначена для хранения данных поставщиков, магазинов пользователей и товаров, импортируемых из XML-фидов различных форматов (YML, Rozetka, Prom, Hotline и т.д.).

---

## 1. Таблица `user_suppliers`

**Назначение:** источники XML-фидов (поставщики).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | serial | Уникальный идентификатор поставщика |
| `user_id` | uuid | Владелец (пользователь из `profiles`) |
| `supplier_name` | text | Название поставщика |
| `website_url` | text | Сайт поставщика |
| `xml_feed_url` | text | URL XML-файла |
| `phone`, `address` | text | Контакты |
| `is_active` | boolean | Активен ли источник |
| `created_at`, `updated_at` | timestamp | Метки времени |

**Связи:**
- (1) → `store_categories`
- (1) → `store_products`

---

## 2. Таблица `user_stores`

**Назначение:** хранит магазины пользователей.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | serial | Уникальный ID магазина |
| `user_id` | uuid | Владелец |
| `template_id` | uuid | Ссылка на шаблон (`store_templates.id`) |
| `store_name` | text | Название магазина |
| `store_url` | text | Ссылка на магазин |
| `custom_mapping` | jsonb | Кастомные правила маппинга |
| `xml_config` | jsonb | Конфигурация экспорта XML |
| `is_active` | boolean | Активность |
| `last_sync` | timestamp | Последняя синхронизация |
| `created_at`, `updated_at` | timestamp | Метки времени |

**Связи:**
- (1) `store_templates` → (∞) `user_stores`
- (1) `user_stores` → (∞) `store_categories`, `store_products`, `store_currencies`, `store_product_links`

---

## 3. Таблица `store_templates`

**Назначение:** шаблоны XML-структур маркетплейсов.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | Уникальный ID |
| `name` | text | Название шаблона |
| `description` | text | Описание |
| `marketplace` | text | Название маркетплейса |
| `xml_structure` | jsonb | Структура XML |
| `mapping_rules` | jsonb | Правила преобразования |
| `is_active` | boolean | Активен |
| `created_at`, `updated_at` | timestamptz | Метки времени |

**Связь:** (1) `store_templates` → (∞) `user_stores`

---

## 4. Таблица `store_categories`

**Назначение:** категории товаров.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | serial | ID категории |
| `store_id` | int | Магазин |
| `supplier_id` | int | Поставщик |
| `external_id` | text | Внешний ID категории |
| `parent_external_id` | text | Родительская категория |
| `name` | text | Название категории |
| `rz_id` | text | ID категории Rozetka |
| `created_at` | timestamp | Метка создания |

**Связи:**
- (1) `user_stores` → (∞) `store_categories`
- (1) `user_suppliers` → (∞) `store_categories`

---

## 5. Таблица `store_currencies`

**Назначение:** хранение валют магазина.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | serial | ID |
| `store_id` | int | Магазин |
| `code` | text | Код валюты (ISO 4217) |
| `rate` | numeric | Курс |
| `is_base` | boolean | Базовая валюта |
| `created_at` | timestamp | Метка времени |

**Связь:** (1) `user_stores` → (∞) `store_currencies`

---

## 6. Таблица `store_products`

**Назначение:** основные данные товаров.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | serial | ID товара |
| `store_id` | int | Магазин |
| `supplier_id` | int | Поставщик |
| `external_id` | text | ID товара из XML |
| `category_external_id` | text | ID категории |
| `currency_code` | text | Валюта |
| `name` | text | Название |
| `name_ua` | text | Название укр. |
| `vendor` | text | Производитель |
| `article` | text | Артикул |
| `url` | text | Ссылка |
| `available` | boolean | Наличие |
| `stock_quantity` | int | Кол-во |
| `price` | numeric | Цена |
| `price_old` | numeric | Старая цена |
| `price_promo` | numeric | Промо-цена |
| `description`, `description_ua` | text | Описание |
| `docket`, `docket_ua` | text | Короткое описание |
| `state` | text | Состояние |
| `created_at`, `updated_at` | timestamp | Метки времени |

**Связи:**
- (1) `user_suppliers` → (∞) `store_products`
- (1) `user_stores` → (∞) `store_products`
- (1) `store_products` → (∞) `store_product_images`, `store_product_params`, `store_product_links`

---

## 7. Таблица `store_product_images`

**Назначение:** изображения товаров.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | serial | ID |
| `product_id` | int | ID товара |
| `url` | text | Ссылка |
| `order_index` | int | Порядок |

**Связь:** (1) `store_products` → (∞) `store_product_images`

---

## 8. Таблица `store_product_params`

**Назначение:** характеристики (`param`) товаров.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | serial | ID |
| `product_id` | int | ID товара |
| `name` | text | Название параметра |
| `value` | text | Значение |
| `paramid` | text | ID параметра Rozetka |
| `valueid` | text | ID значения Rozetka |
| `value_lang` | jsonb | Переводы значений |
| `order_index` | int | Порядок |

**Связь:** (1) `store_products` → (∞) `store_product_params`

---

## 9. Таблица `store_product_links`

**Назначение:** привязка товаров к магазинам (многие ко многим).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | serial | ID |
| `store_id` | int | Магазин |
| `product_id` | int | Товар |
| `is_active` | boolean | Активен |
| `custom_name` | text | Локальное имя |
| `custom_description` | text | Локальное описание |
| `custom_price`, `custom_price_promo` | numeric | Локальные цены |
| `custom_stock_quantity` | int | Остаток |
| `custom_category_id` | text | Категория |
| `created_at`, `updated_at` | timestamp | Метки времени |

**Связи:**
- (∞) `store_product_links` → (1) `store_products`
- (∞) `store_product_links` → (1) `user_stores`

---

## 10. Итоговые связи

```
user_suppliers (1)───(∞) store_categories
user_suppliers (1)───(∞) store_products

user_stores (1)───(∞) store_categories
user_stores (1)───(∞) store_products
user_stores (1)───(∞) store_product_links
user_stores (1)───(∞) store_currencies

store_products (1)───(∞) store_product_images
store_products (1)───(∞) store_product_params
store_products (1)───(∞) store_product_links

store_templates (1)───(∞) user_stores
```
