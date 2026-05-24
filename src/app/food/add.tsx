import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { FoodCatalogItem, MealType } from '@/core/model/food';
import { macrosForServing } from '@/core/model/food';
import { useFoodStore } from '@/stores/food';
import { searchFoods } from '@/services/foodSearch';
import { Body, Button, Field, Hint, OptionGroup, Screen, Subtitle } from '@/ui/components';
import { colors, fontSizes, radii, spacing } from '@/ui/theme';

type Mode = 'search' | 'manual';

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Almuerzo' },
  { value: 'dinner', label: 'Cena' },
  { value: 'snack', label: 'Snack' },
];

function guessMealFromHour(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export default function AddFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const addEntry = useFoodStore((s) => s.addEntry);

  const [mode, setMode] = useState<Mode>(params.mode === 'manual' ? 'manual' : 'search');
  const [mealType, setMealType] = useState<MealType>(guessMealFromHour());

  return (
    <>
      <Stack.Screen options={{ title: 'Agregar comida' }} />
      <Screen>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('search')}
            style={({ pressed }) => [
              styles.modeChip,
              mode === 'search' && styles.modeChipActive,
              pressed && styles.modeChipPressed,
            ]}
          >
            <Text style={[styles.modeLabel, mode === 'search' && styles.modeLabelActive]}>
              Buscar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('manual')}
            style={({ pressed }) => [
              styles.modeChip,
              mode === 'manual' && styles.modeChipActive,
              pressed && styles.modeChipPressed,
            ]}
          >
            <Text style={[styles.modeLabel, mode === 'manual' && styles.modeLabelActive]}>
              Manual
            </Text>
          </Pressable>
        </View>

        <OptionGroup<MealType>
          label="Comida"
          options={MEAL_OPTIONS}
          value={mealType}
          onChange={setMealType}
        />

        {mode === 'search' ? (
          <SearchMode
            mealType={mealType}
            onAdded={async (input) => {
              await addEntry(input);
              router.back();
            }}
          />
        ) : (
          <ManualMode
            mealType={mealType}
            onAdded={async (input) => {
              await addEntry(input);
              router.back();
            }}
          />
        )}
      </Screen>
    </>
  );
}

interface ModeProps {
  mealType: MealType;
  onAdded: (
    input: Parameters<ReturnType<typeof useFoodStore.getState>['addEntry']>[0],
  ) => Promise<void>;
}

function SearchMode({ mealType, onAdded }: ModeProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodCatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodCatalogItem | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);
    setError(null);
    const handle = setTimeout(async () => {
      try {
        const items = await searchFoods(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setResults(items);
          setIsSearching(false);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Error de búsqueda');
          setIsSearching(false);
        }
      }
    }, 350);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  if (selected) {
    return (
      <PortionEditor
        item={selected}
        mealType={mealType}
        onCancel={() => setSelected(null)}
        onSave={onAdded}
      />
    );
  }

  return (
    <View>
      <Field
        label="Buscar"
        placeholder="ej: yogurt natural, pan integral, arroz"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {isSearching ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : null}
      {error ? <Hint>No pudimos buscar. {error}. Prueba modo manual.</Hint> : null}
      {results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelected(item)}
              style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
            >
              <Text style={styles.resultName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.brand ? <Text style={styles.resultBrand}>{item.brand}</Text> : null}
              <Text style={styles.resultMacros}>
                {Math.round(item.kcalPer100g)} kcal · {item.proteinPer100g.toFixed(1)}g proteína por
                100g
              </Text>
            </Pressable>
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          style={{ marginTop: spacing.sm }}
        />
      ) : query.trim().length >= 2 && !isSearching && !error ? (
        <Hint>Sin resultados con datos completos. Prueba modo manual.</Hint>
      ) : (
        <Hint>
          Buscamos en Open Food Facts (productos empaquetados). Si comiste algo casero o de
          restaurante, usa el modo manual.
        </Hint>
      )}
    </View>
  );
}

function PortionEditor({
  item,
  mealType,
  onCancel,
  onSave,
}: {
  item: FoodCatalogItem;
  mealType: MealType;
  onCancel: () => void;
  onSave: ModeProps['onAdded'];
}) {
  const initial = item.typicalServingG ?? 100;
  const [gramsStr, setGramsStr] = useState(initial.toString());
  const [containsAlcohol, setContainsAlcohol] = useState(false);
  const [saving, setSaving] = useState(false);

  const grams = useMemo(() => {
    const n = parseFloat(gramsStr.replace(',', '.'));
    if (Number.isNaN(n) || n <= 0 || n > 5000) return null;
    return n;
  }, [gramsStr]);

  const computed = useMemo(() => (grams ? macrosForServing(item, grams) : null), [item, grams]);

  async function save() {
    if (!grams || !computed) return;
    setSaving(true);
    try {
      await onSave({
        consumedAt: new Date(),
        mealType,
        name: item.name,
        brand: item.brand,
        amountGrams: grams,
        kcal: Math.round(computed.kcal),
        proteinG: Math.round(computed.proteinG * 10) / 10,
        carbsG: computed.carbsG !== undefined ? Math.round(computed.carbsG * 10) / 10 : undefined,
        fatG: computed.fatG !== undefined ? Math.round(computed.fatG * 10) / 10 : undefined,
        fiberG: computed.fiberG !== undefined ? Math.round(computed.fiberG * 10) / 10 : undefined,
        source: 'off',
        confidence: 'high',
        containsAlcohol,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <View style={styles.card}>
        <Subtitle>{item.name}</Subtitle>
        {item.brand ? <Hint>{item.brand}</Hint> : null}
        <Hint>
          {Math.round(item.kcalPer100g)} kcal / {item.proteinPer100g.toFixed(1)}g prot por 100g
        </Hint>
      </View>

      <Field
        label="Cantidad (g)"
        value={gramsStr}
        onChangeText={setGramsStr}
        keyboardType="decimal-pad"
        error={gramsStr.length > 0 && !grams ? 'Entre 1 y 5000 g' : undefined}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Contiene alcohol</Text>
        <Switch
          value={containsAlcohol}
          onValueChange={setContainsAlcohol}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      {computed ? (
        <View style={styles.card}>
          <Subtitle>{Math.round(computed.kcal)} kcal</Subtitle>
          <Body>{computed.proteinG.toFixed(1)} g de proteína</Body>
          {computed.carbsG !== undefined ? (
            <Hint>
              {computed.carbsG.toFixed(1)}g carbs · {(computed.fatG ?? 0).toFixed(1)}g grasa
              {computed.fiberG !== undefined ? ` · ${computed.fiberG.toFixed(1)}g fibra` : ''}
            </Hint>
          ) : null}
        </View>
      ) : null}

      <Button label="Guardar" onPress={save} disabled={!grams || saving} />
      <View style={{ height: spacing.sm }} />
      <Button label="Volver a buscar" variant="ghost" onPress={onCancel} />
    </View>
  );
}

function ManualMode({ mealType, onAdded }: ModeProps) {
  const [name, setName] = useState('');
  const [kcalStr, setKcalStr] = useState('');
  const [proteinStr, setProteinStr] = useState('');
  const [carbsStr, setCarbsStr] = useState('');
  const [fatStr, setFatStr] = useState('');
  const [containsAlcohol, setContainsAlcohol] = useState(false);
  const [saving, setSaving] = useState(false);

  const kcal = useMemo(() => {
    const n = parseFloat(kcalStr);
    return Number.isFinite(n) && n >= 0 && n < 10000 ? n : null;
  }, [kcalStr]);
  const protein = useMemo(() => {
    const n = parseFloat(proteinStr);
    return Number.isFinite(n) && n >= 0 && n < 500 ? n : null;
  }, [proteinStr]);
  const carbs = useMemo(() => {
    if (carbsStr.trim() === '') return undefined;
    const n = parseFloat(carbsStr);
    return Number.isFinite(n) && n >= 0 && n < 1000 ? n : null;
  }, [carbsStr]);
  const fat = useMemo(() => {
    if (fatStr.trim() === '') return undefined;
    const n = parseFloat(fatStr);
    return Number.isFinite(n) && n >= 0 && n < 500 ? n : null;
  }, [fatStr]);

  const canSave =
    name.trim().length > 0 && kcal !== null && protein !== null && carbs !== null && fat !== null;

  async function save() {
    if (!canSave || kcal === null || protein === null) return;
    setSaving(true);
    try {
      await onAdded({
        consumedAt: new Date(),
        mealType,
        name: name.trim(),
        kcal,
        proteinG: protein,
        carbsG: carbs === undefined ? undefined : carbs,
        fatG: fat === undefined ? undefined : fat,
        source: 'manual',
        confidence: 'medium',
        containsAlcohol,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Hint>
        Para comidas caseras o de restaurante: estima lo mejor que puedas. El bayesiano absorbe
        sesgo consistente — registrar imperfecto es mejor que no registrar.
      </Hint>

      <View style={{ height: spacing.md }} />

      <Field
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="ej: pollo arroz palta"
      />
      <Field
        label="Calorías"
        value={kcalStr}
        onChangeText={setKcalStr}
        keyboardType="decimal-pad"
        error={kcalStr.length > 0 && kcal === null ? 'Entre 0 y 10000' : undefined}
      />
      <Field
        label="Proteína (g)"
        value={proteinStr}
        onChangeText={setProteinStr}
        keyboardType="decimal-pad"
        hint="Obligatorio. La proteína es el macro crítico en déficit."
        error={proteinStr.length > 0 && protein === null ? 'Entre 0 y 500' : undefined}
      />
      <Field
        label="Carbohidratos (g) — opcional"
        value={carbsStr}
        onChangeText={setCarbsStr}
        keyboardType="decimal-pad"
        error={carbs === null ? 'Entre 0 y 1000' : undefined}
      />
      <Field
        label="Grasas (g) — opcional"
        value={fatStr}
        onChangeText={setFatStr}
        keyboardType="decimal-pad"
        error={fat === null ? 'Entre 0 y 500' : undefined}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Contiene alcohol</Text>
        <Switch
          value={containsAlcohol}
          onValueChange={setContainsAlcohol}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      <Button
        label={saving ? 'Guardando…' : 'Guardar'}
        onPress={save}
        disabled={!canSave || saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  modeChipPressed: {
    backgroundColor: colors.bgMuted,
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  modeLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  modeLabelActive: {
    color: colors.primary,
  },
  resultRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
  },
  resultRowPressed: {
    backgroundColor: colors.bgMuted,
  },
  resultName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  resultBrand: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  resultMacros: {
    fontSize: fontSizes.sm,
    color: colors.textSubtle,
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  switchLabel: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
});
