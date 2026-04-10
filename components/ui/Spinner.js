export default function Spinner({ size = 20 }) {
  return (
    <div 
      className="spinner" 
      style={{ 
        width: size, 
        height: size,
        border: '2px solid #e2e8f0',
        borderTopColor: '#4a8b7f',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} 
    />
  );
}
