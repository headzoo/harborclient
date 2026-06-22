import { useEffect, type JSX } from 'react';
import logoUrl from '@images/logo-square.png';
import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import { closeAboutModal, selectAboutModal } from '#/renderer/src/store/slices/modalsSlice';
import { fetchAppVersion } from '#/renderer/src/store/thunks';
import { Button } from '#/renderer/src/components/Button';
import { Modal } from '#/renderer/src/ui/shared/Modal';

/**
 * About dialog showing the application name, version, and documentation link.
 */
export function AboutModal(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const about = useAppSelector(selectAboutModal);

  /**
   * Loads the application version from the main process when the dialog opens.
   */
  useEffect(() => {
    if (!about.open) return;
    void dispatch(fetchAppVersion());
  }, [about.open, dispatch]);

  if (!about.open) return null;

  return (
    <Modal
      onClose={() => dispatch(closeAboutModal())}
      className="w-80 !p-6"
      labelledBy="about-modal-title"
    >
      <div className="flex flex-col items-center text-center">
        <img src={logoUrl} alt="HarborClient" className="mb-4 h-16 w-16 rounded-xl" />
        <h2 id="about-modal-title" className="m-0 mb-1 text-[15px] font-semibold text-text">
          HarborClient
        </h2>
        {about.version && <p className="m-0 text-[12px] text-muted">Version {about.version}</p>}
        <a
          href="https://harborclient.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-[14px] text-accent hover:underline"
        >
          Documentation
        </a>
      </div>
      <div className="mt-6 flex justify-center">
        <Button onClick={() => dispatch(closeAboutModal())}>OK</Button>
      </div>
    </Modal>
  );
}
