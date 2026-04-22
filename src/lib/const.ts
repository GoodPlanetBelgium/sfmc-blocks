export const COLORS = [
  { id: 'orange', value: '#e9860d', label: 'Oranje' },
  { id: 'lightgreen', value: '#afca14', label: 'Lichtgroen' },
  { id: 'pink', value: '#e72d52', label: 'Roze' },
  { id: 'green', value: '#29af8a', label: 'Groen' },
  { id: 'blue', value: '#1895d3', label: 'Blauw' }
]

export const namedColors = Object.fromEntries(COLORS.map(({ id, value }) => [id, value]))
