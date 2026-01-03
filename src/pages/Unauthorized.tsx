import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Unauthorized</h1>
        <p className="mt-2">You do not have permission to view this page.</p>
        <Link to="/" className="mt-4 btn btn-primary">Go Home</Link>
      </div>
    </div>
  );
};

export default Unauthorized;