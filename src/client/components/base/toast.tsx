/* 轻提示（Toast）。 */

import { usePopupZIndex } from '../../hooks/use-popup-z-index.js'
import './toast.css'

/** 轻提示 props。 */
export interface NcmToastProps {
  readonly message: string
}

/** 轻提示。 */
export function NcmToast({ message }: NcmToastProps) {
  const zIndex = usePopupZIndex()
  return (
    <div className="ncm-toast" role="status" style={{ zIndex }}>
      {message}
    </div>
  )
}
