import { config, library } from '@fortawesome/fontawesome-svg-core';
import {
  faBars,
  faChevronDown,
  faChevronRight,
  faCircleCheck,
  faClockRotateLeft,
  faGripVertical,
  faPlus,
  faRobot,
  faTableColumns,
  faXmark
} from '@fortawesome/free-solid-svg-icons';

library.add(
  faXmark,
  faPlus,
  faBars,
  faTableColumns,
  faChevronDown,
  faChevronRight,
  faClockRotateLeft,
  faCircleCheck,
  faGripVertical,
  faRobot
);
config.autoAddCss = false;

export {
  faBars,
  faChevronDown,
  faChevronRight,
  faCircleCheck,
  faClockRotateLeft,
  faGripVertical,
  faPlus,
  faRobot,
  faTableColumns,
  faXmark
};
