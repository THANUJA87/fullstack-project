export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="close-button" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
