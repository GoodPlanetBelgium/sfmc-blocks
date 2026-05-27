export type Filter = {
  label: string
  field: string
  options: {
    value: string
    label: string
  }[]
}

export type FilterState = {
  [field: string]: { selectedValues: string[]; includeNull: boolean }
}

const filters: Filter[] = [
  {
    label: 'Region',
    field: 'AccountRegion',
    options: [
      {
        value: 'Flanders',
        label: 'Flanders'
      },
      {
        value: 'Brussels',
        label: 'Brussels'
      },
      {
        value: 'Wallonia',
        label: 'Wallonia'
      }
    ]
  }
]

export default filters
