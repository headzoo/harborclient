import { config, library } from '@fortawesome/fontawesome-svg-core';
import {
  faBars,
  faChevronDown,
  faChevronRight,
  faGripVertical,
  faPlus,
  faTableColumns,
  faXmark
} from '@fortawesome/free-solid-svg-icons';

library.add(faXmark, faPlus, faBars, faTableColumns, faChevronDown, faChevronRight, faGripVertical);
config.autoAddCss = false;

export { faBars, faChevronDown, faChevronRight, faGripVertical, faPlus, faTableColumns, faXmark };
