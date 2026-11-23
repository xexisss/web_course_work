# Сторонние компоненты

Лицензия LinguaTrade (файл LICENSE) распространяется только на код автора.
Перечисленные ниже компоненты не входят в репозиторий (кроме шрифта),
устанавливаются командой `npm install` и сохраняют свои лицензии. Все они
допускают использование в бесплатной проприетарной программе при условии
сохранения уведомлений об авторских правах.

## Серверная часть (backendfinal)

| Пакет | Лицензия |
|---|---|
| express | MIT |
| @prisma/client, prisma | Apache-2.0 |
| bcryptjs | BSD-3-Clause |
| cors | MIT |
| dotenv | BSD-2-Clause |
| jsonwebtoken | MIT |
| multer | MIT |
| pdfkit | MIT |
| zod | MIT |
| typescript (dev) | Apache-2.0 |
| tsx (dev) | MIT |

## Клиентская часть (frontendfinal)

| Пакет | Лицензия |
|---|---|
| react, react-dom | MIT |
| react-router-dom | MIT |
| vite, @vitejs/plugin-react (dev) | MIT |
| eslint (dev) | MIT |

## Шрифт для PDF-отчётов

`backendfinal/assets/fonts/PTSans-Regular.ttf`, `PTSans-Bold.ttf` –
PT Sans, Copyright (c) 2010 ParaType Ltd., SIL Open Font License 1.1
(текст лицензии – `backendfinal/assets/fonts/OFL.txt`). Шрифт заменил
ранее использовавшиеся файлы ReportSans*.ttf, которые были копией
шрифта Arial (Monotype/Microsoft) и не могли распространяться в
репозитории.
