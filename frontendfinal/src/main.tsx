// SPDX-FileCopyrightText: 2026 Длусский Артём <adlusski@gmail.com>
// SPDX-License-Identifier: LicenseRef-LinguaTrade-Freeware-1.0
//
// LinguaTrade – платформа заказа переводов. Бесплатная программа (freeware).
// Изменение и распространение изменённых версий запрещены, см. файл LICENSE.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
