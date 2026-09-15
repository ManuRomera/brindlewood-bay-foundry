import { BASE, LIMITS } from "./rules.mjs";
const f = foundry.data.fields;
const str = (initial = "") => new f.StringField({ initial, required: true });
const num = (initial = 0, min = 0, max = 9999) =>
  new f.NumberField({ initial, integer: true, min, max, required: true });
const arrayOptions = (max) => max === undefined ? { initial: [] } : { initial: [], max };
const arr = (max) => new f.ArrayField(new f.ObjectField(), arrayOptions(max));
const nums = (max) =>
  new f.ArrayField(new f.NumberField({ integer: true }), arrayOptions(max));
export class ExpertModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      style: str(),
      hobby: str(),
      description: str(),
      stats: new f.SchemaField(
        Object.fromEntries(
          Object.entries(BASE).map(([k, v]) => [k, num(v, LIMITS.statMin, LIMITS.statMax)]),
        ),
      ),
      xp: num(0, 0, LIMITS.xp),
      xpPending: num(0, 0, LIMITS.sessionQuestions + 1),
      queen: nums(LIMITS.queen),
      void: num(0, 0, LIMITS.void),
      conditions: new f.ArrayField(str(), { initial: [], max: LIMITS.conditions }),
      home: arr(LIMITS.home),
      pending: arr(),
      advances: nums(LIMITS.advances),
      questions: new f.ArrayField(new f.NumberField({ integer: true }), {
        initial: [0, 1, 2],
      }),
      history: arr(),
      retired: new f.BooleanField({ initial: false }),
      ready: new f.BooleanField({ initial: false }),
      endSession: num(),
      bonus: num(0, 0, 30),
    };
  }
}
export class MysteryModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: str(),
      sourceId: str(),
      complexity: num(6, 1, 20),
      status: str("active"),
      voidMystery: new f.BooleanField({ initial: false }),
      clues: arr(),
      suspects: arr(LIMITS.suspectsMax),
      theory: str(),
      history: arr(),
    };
  }
}
export class NPCModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { description: str(), source: str() };
  }
}
export class MoveModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: str(),
      source: str(),
      key: str(),
      frequency: str("unlimited"),
      automatic: new f.BooleanField({ initial: false }),
      used: new f.BooleanField({ initial: false }),
    };
  }
}
