// Entry point for /authors-note: the note text comes straight from emosh.txt.

import note from '../../emosh.txt?raw'
import { renderNote } from './authors-note.js'
import { initShell } from './shell.js'

initShell()
document.getElementById('note').innerHTML = renderNote(note)
