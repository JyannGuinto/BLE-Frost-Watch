import WarehouseMap from "../components/WarehouseMap";

function WarehouseLive() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="max-w-6xl w-full bg-white rounded-lg shadow-lg p-4">
        <WarehouseMap />
      </div>
    </div>
  );
}

export default WarehouseLive;