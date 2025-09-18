-- Create enums for user roles and status
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'user',
  status public.user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  parent_id INTEGER REFERENCES public.menu_items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, menu_item_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create function to get current user role (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- RLS Policies for menu_items table
CREATE POLICY "Authenticated users can view active menu items" ON public.menu_items
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage menu items" ON public.menu_items
  FOR ALL USING (public.is_admin());

-- RLS Policies for user_permissions table
CREATE POLICY "Users can view their own permissions" ON public.user_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all permissions" ON public.user_permissions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all permissions" ON public.user_permissions
  FOR ALL USING (public.is_admin());

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN 'admin'::public.user_role
      ELSE 'user'::public.user_role
    END,
    'active'::public.user_status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user registers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default menu items
INSERT INTO public.menu_items (title, path, order_index) VALUES
  ('Dashboard', '/dashboard', 1),
  ('Users', '/users', 2),
  ('Menu Management', '/menu', 3),
  ('Reports', '/reports', 4),
  ('Settings', '/settings', 5);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_menu_items_parent_id ON public.menu_items(parent_id);
CREATE INDEX idx_menu_items_active ON public.menu_items(is_active);
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_menu_item_id ON public.user_permissions(menu_item_id);