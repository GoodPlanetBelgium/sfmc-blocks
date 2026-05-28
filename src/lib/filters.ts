export type Filter = {
  label: string
  field: string
  options: {
    value: string
    label: string
  }[]
}

export type FilterFieldState = { selectedValues: string[]; includeNull: boolean }

export type FilterState = {
  operators?: Record<string, 'AND' | 'OR'>
  groups?: string[]
  [field: string]: FilterFieldState | Record<string, 'AND' | 'OR'> | string[] | undefined
}

export function getFieldState(fs: FilterState, field: string): FilterFieldState | undefined {
  const v = fs[field]
  return v && typeof v === 'object' && 'selectedValues' in v ? (v as FilterFieldState) : undefined
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
  },
  {
    label: 'Province',
    field: 'AccountProvince',
    options: [
      { value: 'Antwerpen', label: 'Antwerpen' },
      { value: 'BHG-RBC', label: 'BHG-RBC' },
      { value: 'Brabant Wallon', label: 'Brabant Wallon' },
      { value: 'Hainaut', label: 'Hainaut' },
      { value: 'Liège', label: 'Liège' },
      { value: 'Limburg', label: 'Limburg' },
      { value: 'Luxembourg', label: 'Luxembourg' },
      { value: 'Namur', label: 'Namur' },
      { value: 'Oost-Vlaanderen', label: 'Oost-Vlaanderen' },
      { value: 'Vlaams-Brabant', label: 'Vlaams-Brabant' },
      { value: 'West-Vlaanderen', label: 'West-Vlaanderen' }
    ]
  },
  {
    label: 'School Type',
    field: 'AccountSchoolType',
    options: [
      { label: 'Nursery School', value: 'Nursery_School' },
      { label: 'Primary School', value: 'Primary_School' },
      { label: 'Nursery & Primary School', value: 'Nursery_And_Primary_School' },
      { label: 'Secondary School', value: 'Secondary_School' },
      { label: 'Higher Education', value: 'Higher_Education' },
      { label: 'Adult Education', value: 'Adult_Education' },
      { label: 'Secondary School Specialized', value: 'Secondary_School_Specialized' },
      { label: 'Nursery School Specialized', value: 'Nursery_School_Specialized' },
      { label: 'Primary School Specialized', value: 'Primary_School_Specialized' },
      {
        label: 'Nursery & Primary School Specialized',
        value: 'Nursery_And_Primary_School_Specialized'
      }
    ]
  }
]

export default filters
