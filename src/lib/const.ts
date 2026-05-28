export const COLORS = [
  { id: 'orange', value: '#e9860d', label: 'Orange' },
  { id: 'lightgreen', value: '#afca14', label: 'Light green' },
  { id: 'pink', value: '#e72d52', label: 'Pink' },
  { id: 'green', value: '#29af8a', label: 'Green' },
  { id: 'blue', value: '#1895d3', label: 'Blue' }
]

export const namedColors = Object.fromEntries(COLORS.map(({ id, value }) => [id, value]))
