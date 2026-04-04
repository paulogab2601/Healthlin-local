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
  Modality?: string
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

export type DicomTagPrimitive = string | number | null
export type DicomTagValue = DicomTagPrimitive | DicomTagValue[] | { [key: string]: DicomTagValue }
export type SafeSpacingSource = 'PixelSpacing' | 'ImagerPixelSpacing' | null

export interface SimplifiedTags {
  PatientName?: DicomTagValue
  PatientID?: DicomTagValue
  PatientBirthDate?: DicomTagValue
  PatientSex?: DicomTagValue
  StudyDate?: DicomTagValue
  StudyDescription?: DicomTagValue
  Modality?: DicomTagValue
  SeriesDescription?: DicomTagValue
  InstanceNumber?: DicomTagValue
  SliceThickness?: DicomTagValue
  PixelSpacing?: DicomTagValue
  ImagerPixelSpacing?: DicomTagValue
  safeSpacing?: DicomTagValue
  safeSpacingSource?: SafeSpacingSource
  NumberOfFrames?: DicomTagValue
  Rows?: DicomTagValue
  Columns?: DicomTagValue
  KVP?: DicomTagValue
  ExposureTime?: DicomTagValue
  [key: string]: DicomTagValue | undefined
}
