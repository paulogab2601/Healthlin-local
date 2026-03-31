export interface PatientMainDicomTags {
  PatientName?: string
  PatientID?: string
  PatientBirthDate?: string
  PatientSex?: string
}

export interface Patient {
  ID: string
  MainDicomTags: PatientMainDicomTags
  Studies: string[]
}

export interface StudyMainDicomTags {
  StudyDate?: string
  StudyDescription?: string
  AccessionNumber?: string
  StudyInstanceUID?: string
  ReferringPhysicianName?: string
  ModalitiesInStudy?: string
}

export interface Study {
  ID: string
  PatientID: string
  MainDicomTags: StudyMainDicomTags
  PatientMainDicomTags: PatientMainDicomTags
  Series: string[]
}

export interface SeriesMainDicomTags {
  SeriesDescription?: string
  Modality?: string
  SeriesNumber?: string
  SeriesDate?: string
  BodyPartExamined?: string
}

export interface Series {
  ID: string
  ParentStudy: string
  MainDicomTags: SeriesMainDicomTags
  Instances: string[]
}

export interface InstanceMainDicomTags {
  SOPInstanceUID?: string
  InstanceNumber?: string
}

export interface Instance {
  ID: string
  ParentSeries: string
  MainDicomTags: InstanceMainDicomTags
}

export interface SimplifiedTags {
  PatientName?: string
  PatientID?: string
  PatientBirthDate?: string
  PatientSex?: string
  StudyDate?: string
  StudyDescription?: string
  Modality?: string
  SeriesDescription?: string
  InstanceNumber?: string
  SliceThickness?: string
  PixelSpacing?: string
  Rows?: string
  Columns?: string
  KVP?: string
  ExposureTime?: string
  [key: string]: string | undefined
}
