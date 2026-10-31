// The 16-week program from fitness_system_updated_16_weeks.xlsx (sheet «Программа»).
// An exercise keeps the same id in both blocks when it is the same movement,
// so progress can be compared across blocks (the «якорь» exercises).

export type Day = 'A' | 'B' | 'C' | 'D';
export type Block = 1 | 2;

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  per?: 'нога' | 'рука' | 'сторона';
  rir: number;
  goal: string;
  optional?: boolean;
  /** Gravitron-style: the weight is assistance, so less is better. */
  assisted?: boolean;
  /** Bodyweight by default; weight is optional extra load. */
  bodyweight?: boolean;
}

export const TOTAL_WEEKS = 16;
export const DAYS: Day[] = ['A', 'B', 'C', 'D'];
export const DAY_TITLE: Record<Day, string> = { A: 'Ягодицы', B: 'Спина', C: 'Ягодицы', D: 'Верх тела' };
export const DAY_SHORT: Record<Day, string> = { A: 'Ягодицы', B: 'Спина', C: 'Ягодицы', D: 'Верх' };
/** Planned weekday, 0 = Sunday. */
export const DAY_WEEKDAY: Record<Day, number> = { A: 1, B: 2, C: 4, D: 6 };

function ex(
  id: string,
  name: string,
  sets: number,
  reps: [number, number],
  goal: string,
  extra: Partial<Exercise> = {},
): Exercise {
  return { id, name, sets, repMin: reps[0], repMax: reps[1], rir: 2, goal, ...extra };
}

export const PROGRAM: Record<Block, Record<Day, Exercise[]>> = {
  1: {
    A: [
      ex('glute-bridge-smith', 'Ягодичный мост в Смите', 3, [8, 10], 'Главный ягодичный стимул'),
      ex('reverse-lunge-db', 'Обратные выпады с гантелями', 2, [8, 10], 'Ягодицы + квадрицепс', { per: 'нога' }),
      ex('single-leg-press', 'Жим ногами одной ногой', 2, [10, 12], 'Умеренная работа ног', { per: 'нога' }),
      ex('cable-abduction-standing', 'Отведение бедра в кроссовере стоя', 2, [12, 15], 'Бок ягодиц', { per: 'нога' }),
      ex('leg-extension', 'Разгибание ног сидя', 2, [12, 15], 'Контур квадрицепса'),
    ],
    B: [
      ex('gravitron-pullup', 'Подтягивания в гравитроне нейтральным хватом', 3, [6, 10], 'Широчайшие', { assisted: true }),
      ex('t-bar-row', 'Тяга Т-грифа с опорой грудью', 3, [8, 12], 'Толщина спины'),
      ex('straight-arm-pulldown', 'Пуловер на блоке прямыми руками', 2, [12, 15], 'Широчайшие'),
      ex('cable-lateral-raise', 'Махи в сторону одной рукой на блоке', 3, [12, 15], 'Средняя дельта'),
      ex('incline-y-raise', 'Y-raise на наклонной скамье', 2, [12, 15], 'Контроль лопаток'),
      ex('face-pull', 'Face pull', 2, [12, 15], 'Задняя дельта и лопатки'),
    ],
    C: [
      ex('rdl-db', 'Румынская тяга с гантелями', 3, [8, 10], 'Ягодицы и задняя поверхность'),
      ex('hyperextension-45', 'Гиперэкстензия 45° с ягодичным акцентом', 3, [10, 12], 'Ягодицы'),
      ex('cable-pull-through', 'Cable pull-through', 2, [12, 15], 'По самочувствию: убрать при усталости', { optional: true }),
      ex('seated-leg-curl', 'Сгибание ног сидя', 2, [10, 15], 'Задняя поверхность'),
      ex('seated-abduction', 'Отведение бедра сидя', 2, [15, 20], 'Бок ягодиц'),
    ],
    D: [
      ex('incline-db-press', 'Жим гантелей на наклонной скамье', 3, [8, 12], 'Грудь'),
      ex('single-arm-pulldown', 'Вертикальная тяга одной рукой', 2, [10, 12], 'Спина', { per: 'рука' }),
      ex('landmine-press', 'Жим одной рукой в лэндмайне', 2, [10, 12], 'Плечи', { per: 'рука' }),
      ex('db-fly', 'Разводка гантелей лёжа', 2, [12, 15], 'Грудь'),
      ex('machine-lateral-raise', 'Разведения в стороны в тренажёре', 2, [12, 15], 'Средняя дельта'),
      ex('pallof-press', 'Pallof press', 2, [10, 12], 'Корпус', { per: 'сторона' }),
      ex('reverse-crunch', 'Reverse crunch', 2, [12, 15], 'Пресс', { bodyweight: true }),
    ],
  },
  2: {
    A: [
      ex('glute-bridge-machine', 'Ягодичный мост в тренажёре', 3, [6, 10], 'Главный ягодичный стимул'),
      ex('bulgarian-split-squat', 'Болгарский присед с ягодичным акцентом', 2, [8, 12], 'Ягодицы + ноги', { per: 'нога' }),
      ex('leg-press-mid', 'Жим ногами со средней постановкой', 2, [10, 12], 'Умеренная работа ног'),
      ex('seated-abduction', 'Отведение бедра сидя', 2, [15, 20], 'Бок ягодиц'),
      ex('leg-extension', 'Разгибание ног сидя', 2, [10, 15], 'Квадрицепс'),
    ],
    B: [
      ex('neutral-pulldown', 'Вертикальная тяга нейтральным хватом', 3, [8, 12], 'Широчайшие'),
      ex('chest-supported-row', 'Горизонтальная тяга с опорой грудью', 3, [8, 12], 'Спина'),
      ex('cable-single-arm-row', 'Тяга одной рукой в кроссовере', 2, [10, 12], 'Контроль лопатки', { per: 'рука' }),
      ex('db-lateral-raise', 'Махи гантелями в стороны', 3, [12, 20], 'Средняя дельта'),
      ex('cable-y-raise', 'Y-raise на блоке', 2, [12, 15], 'Нижняя трапеция'),
      ex('face-pull', 'Face pull', 2, [12, 15], 'Задняя дельта'),
    ],
    C: [
      ex('rdl-db', 'Румынская тяга с гантелями', 3, [8, 10], 'Якорь: сравниваем с блоком 1'),
      ex('hyperextension-45', 'Гиперэкстензия 45° с ягодичным акцентом', 3, [10, 15], 'Якорь: сравниваем с блоком 1'),
      ex('step-up', 'Step-up на комфортную платформу', 2, [8, 12], 'Ягодицы + ноги', { per: 'нога' }),
      ex('lying-leg-curl', 'Сгибание ног лёжа', 2, [10, 15], 'Задняя поверхность'),
      ex('cable-abduction-side', 'Отведение ноги в кроссовере в сторону', 2, [12, 20], 'Бок ягодиц', { per: 'нога' }),
    ],
    D: [
      ex('machine-chest-press', 'Жим в грудном тренажёре', 3, [8, 12], 'Грудь'),
      ex('single-arm-lat-pulldown', 'Тяга верхнего блока одной рукой', 2, [10, 12], 'Спина', { per: 'рука' }),
      ex('seated-db-press', 'Жим гантелей сидя', 2, [8, 12], 'Плечи'),
      ex('cable-fly', 'Сведение рук в кроссовере', 2, [12, 15], 'Грудь'),
      ex('db-lateral-raise-d', 'Разведения гантелей в стороны', 2, [12, 20], 'Дельты'),
      ex('pallof-press', 'Pallof press', 2, [10, 12], 'Корпус', { per: 'сторона' }),
      ex('dead-bug', 'Dead bug', 2, [8, 12], 'Корпус', { per: 'сторона', bodyweight: true }),
    ],
  },
};

const BY_ID = new Map<string, Exercise>();
const DAY_OF = new Map<string, Day>();
for (const block of [1, 2] as Block[]) {
  for (const day of DAYS) {
    for (const e of PROGRAM[block][day]) {
      if (!BY_ID.has(e.id)) BY_ID.set(e.id, e);
      if (!DAY_OF.has(e.id)) DAY_OF.set(e.id, day);
    }
  }
}

export function EX(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

export function dayOf(id: string): Day {
  return DAY_OF.get(id) ?? 'A';
}

/** Exercise ids in program order, without duplicates. */
export const EXERCISE_ORDER: string[] = [...BY_ID.keys()];

export function planFor(block: Block, day: Day): Exercise[] {
  return PROGRAM[block][day];
}

export function blockOf(week: number): Block {
  return week <= 8 ? 1 : 2;
}
