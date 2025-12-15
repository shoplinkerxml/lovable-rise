import type { Dictionary } from "../types";

export const authDictionary: Dictionary = {
  login_title: { uk: "Вхід до MarketGrow", en: "Sign in to MarketGrow" },
  login_desc: {
    uk: "Доступ до адмін‑панелі керування даними",
    en: "Access the data admin panel",
  },
  email: { uk: "Ел. пошта", en: "Email" },
  password: { uk: "Пароль", en: "Password" },
  sign_in: { uk: "Увійти", en: "Sign in" },
  no_account: { uk: "Немає акаунта?", en: "No account?" },
  sign_up: { uk: "Зареєструватись", en: "Sign up" },
  logout: { uk: "Вийти", en: "Logout" },
  user_profile: { uk: "Профіль користувача", en: "User Profile" },
  menu_profile: { uk: "Мій профіль", en: "My Profile" },
  nav_login: { uk: "Увійти", en: "Log in" },
  nav_get_started: { uk: "Почати безкоштовно", en: "Get started free" },
  facebook_signup: { uk: "Facebook", en: "Facebook" },
  google_signin: { uk: "Google", en: "Google" },
  facebook_signin: {
    uk: "Увійти через Facebook",
    en: "Sign in with Facebook",
  },
  social_disabled: { uk: "Незабаром", en: "Coming soon" },
  or_sign_in_with: {
    uk: "або увійдіть за допомогою",
    en: "or sign in with",
  },
  tab_register: { uk: "Реєстрація", en: "Register" },
  tab_login: { uk: "Увйти", en: "Login" },
  tab_reset: { uk: "Відновлення", en: "Reset" },
  already_account: {
    uk: "Вже є акаунт?",
    en: "Already have account?",
  },
  no_account_user: { uk: "Немає акаунта?", en: "No account?" },
  forgot_password: {
    uk: "Забули пароль?",
    en: "Forgot password?",
  },
  back_to_login: {
    uk: "Повернутися до входу",
    en: "Back to login",
  },
  name_required: { uk: "Ім'я обов'язкове", en: "Name is required" },
  name_min_length: {
    uk: "Ім'я має бути не менше 2 символів",
    en: "Name must be at least 2 characters",
  },
  email_invalid: { uk: "Невірний email", en: "Invalid email" },
  email_required: {
    uk: "Email обов'язковий",
    en: "Email is required",
  },
  password_required: {
    uk: "Пароль обов'язковий",
    en: "Password is required",
  },
  password_min: {
    uk: "Мінімум 8 символів",
    en: "Minimum 8 characters",
  },
  passwords_match: {
    uk: "Паролі не співпадають",
    en: "Passwords don't match",
  },
  confirm_password_required: {
    uk: "Підтвердження паролю обов'язкове",
    en: "Password confirmation is required",
  },
  registration_success: {
    uk: "Реєстрація успішна! Перенаправляємо на сторінку входу...",
    en: "Registration successful! Redirecting to login page...",
  },
  login_success: { uk: "Успішний вхід!", en: "Login successful!" },
  registration_failed: {
    uk: "Помилка реєстрації. Спробуйте ще раз",
    en: "Registration failed. Please try again",
  },
  login_failed: {
    uk: "Помилка входу. Перевірте ваші дані.",
    en: "Login failed. Please check your credentials.",
  },
  invalid_credentials: {
    uk: "Неправильний email або пароль",
    en: "Invalid email or password",
  },
  email_exists: {
    uk: "Користувач з таким email вже зареєстрований. Спробуйте увійти.",
    en: "User with this email is already registered. Try signing in.",
  },
  weak_password: {
    uk: "Пароль занадто слабкий",
    en: "Password is too weak",
  },
  network_error: {
    uk: "Помилка мережі. Спробуйте пізніше.",
    en: "Network error. Please try again later.",
  },
  continue_with_email: {
    uk: "або продовжити з email",
    en: "or continue with email",
  },
  continue_with_signin: {
    uk: "або увійдіть за допомогою",
    en: "or sign in with",
  },
  profile_creation_failed: {
    uk: "Не вдалося створити профіль",
    en: "Failed to create profile",
  },
  email_confirmation_required: {
    uk: "Підтвердження email обов'язкове",
    en: "Email confirmation required",
  },
  login_success_admin: {
    uk: "Ви успішно увійшли в кабінет адміністратора",
    en: "You have successfully logged into the administrator dashboard",
  },
  welcome_back: { uk: "З поверненням!", en: "Welcome back!" },
  auth_failed: {
    uk: "Помилка автентифікації. Спробуйте ще раз.",
    en: "Authentication failed. Please try again.",
  },
  email_confirmed: {
    uk: "Електронну пошту успішно підтверджено!",
    en: "Email confirmed successfully!",
  },
  email_confirmed_welcome: {
    uk: "Електронну пошту успішно підтверджено! Ласкаво просимо до MarketGrow!",
    en: "Email confirmed successfully! Welcome to MarketGrow!",
  },
  account_confirmed_setup_failed: {
    uk: "Обліковий запис підтверджено, але не вдалося налаштувати профіль. Спробуйте увійти ще раз.",
    en: "Account confirmed but profile setup failed. Please try signing in again.",
  },
  oauth_failed: {
    uk: "Помилка автентифікації. Спробуйте увійти ще раз.",
    en: "Authentication failed. Please try signing in again.",
  },
  please_sign_in_complete_registration: {
    uk: "Будь ласка, увійдіть, щоб завершити реєстрацію.",
    en: "Please sign in to complete your registration.",
  },
  failed_logout: { uk: "Не вдалося вийти", en: "Failed to logout" },
  logged_out_successfully: {
    uk: "Вихід успішно виконано",
    en: "Logged out successfully",
  },
  failed_send_reset_email: {
    uk: "Не вдалося надіслати електронний лист для скидання",
    en: "Failed to send reset email",
  },
  reset_success: {
    uk: "Електронний лист для скидання пароля надіслано",
    en: "Password reset email sent",
  },
  password_reset_sent: {
    uk: "Електронний лист для скидання пароля надіслано. Перевірте вашу поштову скриньку.",
    en: "Password reset email sent. Please check your inbox.",
  },
  please_log_in: {
    uk: "Будь ласка, увійдіть, щоб продовжити",
    en: "Please log in to continue",
  },
};
