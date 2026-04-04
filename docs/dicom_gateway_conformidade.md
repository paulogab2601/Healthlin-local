# Conformidade Minima do Gateway DICOM Local

## Arquitetura Atual
`Maquina RX -> Orthanc local (servidor proprietario na clinica) -> Google Healthcare -> App (Flutter/Web)`

## Papel do Orthanc Local
- Gateway DICOM dentro da clinica.
- Fonte de dados para a interface local/app via API HTTP atual.
- Nao substitui o fluxo de integracao DICOMweb em nuvem.

## Interface Atual e DICOMweb
- A interface atual consome API proprietaria do Orthanc local.
- O frontend **nao** usa DICOMweb diretamente neste desenho.
- A integracao/conversao DICOMweb fica delegada ao Google Healthcare.

## Modalidades Esperadas no Frontend Atual
- Filtros/rotulos existentes na UI: `DX`, `CR`, `CT`, `MR`, `US`, `MG`.
- Mapeamentos adicionais de exibicao: `NM`, `PT`, `XA`, `OT`.
- Isso representa escopo de exibicao atual e **nao** significa suporte irrestrito a todas as variacoes DICOM.

## Limitacoes Conhecidas
- `SimplifiedTags` pode variar por vendor/modalidade e deve ser tratado de forma defensiva.
- `safeSpacing` usa fallback pragmatico (`PixelSpacing -> ImagerPixelSpacing -> null`) e informa origem em `safeSpacingSource`.
- Quando `safeSpacingSource = ImagerPixelSpacing`, o valor e exibido como fallback nao calibrado/nao absoluto.
- Arquivos multi-frame (`NumberOfFrames > 1`) nao possuem suporte completo no viewer atual; o caso e sinalizado e tratado com fallback controlado.

## Claim de Suporte
O sistema atual **nao deve** alegar conformidade generica irrestrita com todo DICOM. O suporte real e o do fluxo acima, com as limitacoes descritas.
