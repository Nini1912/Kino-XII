export function normalizeSections(payload) {
  const sections = payload?.sections ?? payload?.layout?.sections ?? [];
  return sections.map((section, sectionIndex) => ({
    name: section.name ?? section.label ?? `Section ${sectionIndex + 1}`,
    rows: (section.rows ?? []).map((row, rowIndex) => ({
      label: row.label ?? row.name ?? String(rowIndex + 1),
      seats: (row.seats ?? []).map((seat, seatIndex) => {
        if (seat === null) return { gap: true, key: `gap-${seatIndex}` };
        const status = String(
          seat.state ??
            seat.status ??
            (seat.isAvailable === false ? "sold" : "available"),
        ).toLowerCase();
        return {
          ...seat,
          id: seat.id ?? seat.seatId,
          code:
            seat.code ??
            `${row.label ?? row.name}${seat.number ?? seat.label ?? seatIndex + 1}`,
          label: seat.label ?? seat.number ?? seat.seatNumber ?? seatIndex + 1,
          status,
          gap:
            status === "unavailable" ||
            seat.isAisle === true ||
            seat.isGap === true,
          aisleAfter: Boolean(seat.aisleAfter),
          isMine: Boolean(seat.isMine),
        };
      }),
    })),
  }));
}

export function allSeats(sections) {
  return sections
    .flatMap((section) => section.rows.flatMap((row) => row.seats))
    .filter((seat) => !seat.gap);
}

export function getTicketTypes(options, movie) {
  const raw = options?.ticketTypes ?? options?.ticket_types ?? [];
  const types = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([slug, item]) => ({
        slug,
        ...(typeof item === "number" ? { ratio: item } : item),
      }));
  const normalized = types.map((item) => {
    const slug = item.slug ?? item.id ?? item.code;
    const rawRatio =
      item.ratio ??
      item.multiplier ??
      item.priceMultiplier ??
      (item.percentage != null ? Number(item.percentage) / 100 : 1);
    const ratio =
      Number(rawRatio) > 1 ? Number(rawRatio) / 100 : Number(rawRatio);
    return {
      slug,
      name: item.name ?? String(slug),
      ratio: Number.isFinite(ratio) ? ratio : 1,
    };
  });
  const minAge = Number(movie?.ageRating?.minAge ?? 0);
  return normalized.filter((item) => !(item.slug === "child" && minAge >= 16));
}

export function getMaxSeats(options) {
  return Number(
    options?.maxSeatsPerOrder ?? options?.booking?.maxSeatsPerOrder ?? 3,
  );
}
