const suggestionValue = (data, key) => String(data.get(`${key}Custom`) || data.get(`${key}Preset`) || "").trim();

export const identityFrom = (data) => ({
  name: suggestionValue(data, "name"),
  style: suggestionValue(data, "style"),
  hobby: suggestionValue(data, "hobby"),
});

export const identityIssue = (data, actors = []) => {
  const identity = identityFrom(data);
  if (!identity.name) return "elige o escribe el nombre y apellido.";
  if (!identity.style) return "elige o escribe el estilo.";
  if (!identity.hobby) return "elige o escribe el quehacer favorito.";
  const hobby = identity.hobby.normalize("NFKC").toLocaleLowerCase("es");
  if (actors.some((actor) => !actor.system.retired && actor.system.hobby.normalize("NFKC").toLocaleLowerCase("es").trim() === hobby))
    return "ese quehacer ya pertenece a otra Experta activa.";
  return "";
};

export const lifeFrom = (data) => ({
  partner: String(data.get("partner") ?? "").trim(),
  family: String(data.get("family") ?? "").trim(),
  career: String(data.get("career") ?? "").trim(),
  home: [1, 2, 3, 4, 5].map((index) => String(data.get(`home${index}`) ?? "").trim()),
  questions: [0, ...[1, 2, 3, 4, 5, 6].filter((index) => data.has(`q${index}`))],
});

export const lifeIssue = (data) => {
  const life = lifeFrom(data);
  if (!life.partner) return "describe a su pareja fallecida.";
  if (!life.family) return "describe a sus hijos, familia o mascotas.";
  if (!life.career) return "indica su carrera antes de retirarse.";
  const homes = life.home.filter(Boolean);
  if (homes.length < 3 || homes.length > 5) return "anota entre tres y cinco objetos de Hogar, dulce hogar.";
  if (life.questions.length !== 3) return "marca exactamente dos objetivos además del primero.";
  return "";
};
