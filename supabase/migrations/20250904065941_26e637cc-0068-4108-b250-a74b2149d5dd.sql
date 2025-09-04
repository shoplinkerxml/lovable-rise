-- Исправляем функцию check_menu_depth с правильным search_path
CREATE OR REPLACE FUNCTION public.check_menu_depth()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Проверяем что мы не создаем подменю у подменю (максимум 2 уровня)
  IF NEW.parent_id IS NOT NULL THEN
    -- Проверяем что родитель не является подменю
    IF EXISTS (
      SELECT 1 FROM public.menu_items 
      WHERE id = NEW.parent_id AND parent_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Нельзя создавать подменю третьего уровня. Максимальная глубина: 2 уровня.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;