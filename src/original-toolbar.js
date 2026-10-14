// 0x29DA8: a grouped slot stores a one-based selection in its low byte.
export function toolbarSlots(data, rating, choices = {}) {
  rating=Math.min(5,rating);
  return data.toolbar.ratings[rating].map((packed, slot) => {
    const group = packed >> 8;
    const icons = group ? data.toolbar.groups[group] : [packed & 255];
    const preferred = choices[slot];
    const icon = icons.includes(preferred) ? preferred : group ? icons[(packed & 255) - 1] : icons[0];
    return { slot, group, icons, icon, type: data.toolbar.iconTypes[icon] };
  });
}
