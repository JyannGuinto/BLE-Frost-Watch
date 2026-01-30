const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Ble = require("../models/Ble");
const { assignBle, unassignBle } = require("../utils/bleAssignment");

// CREATE employee
exports.createEmployee = async (req, res) => {
  try {
    const { employeeId, fullName, department, position, bleTag, allowedZones } = req.body;

    // Auto-generate employeeId if missing
    let finalEmployeeId = employeeId?.trim();
    if (!finalEmployeeId) {
      const count = await Employee.countDocuments();
      finalEmployeeId = `EMP${String(count + 1).padStart(3, "0")}`;
    }

    // Check duplicate employeeId
    const existing = await Employee.findOne({ employeeId: finalEmployeeId });
    if (existing)
      return res.status(400).json({ message: "Employee ID already exists" });

    // Create employee record
    const employee = new Employee({
  employeeId: finalEmployeeId,
  fullName,
  department,
  position,
  bleTag: bleTag || null,
  allowedZones: Array.isArray(allowedZones) ? allowedZones : [],
});
    await employee.save();

    // Assign BLE if provided
    if (bleTag) {
      await assignBle(bleTag, "employee", employee._id);
    }

    // Populate BLE and allowedZones before sending response
    const populated = await Employee.findById(employee._id)
      .populate("bleTag", "bleId uuid type status")
      .populate("allowedZones", "name zoneId"); // <-- populate zone info

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//  READ all employees (with search + pagination)
exports.getEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const safePage = Math.max(1, parseInt(page));
    const safeLimit = Math.max(1, parseInt(limit));

    let filter = {};

    if (search && search.trim() !== "") {
      filter = {
        $or: [
          { employeeId: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
          { department: { $regex: search, $options: "i" } },
          { position: { $regex: search, $options: "i" } },
        ],
      };
    }

    const total = await Employee.countDocuments(filter);

    const employees = await Employee.find(filter)
      .populate("bleTag", "bleId uuid type status")
      .populate("allowedZones", "name zoneId")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    res.json({
      employees,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      total,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// GET employees for dropdown (NO pagination)
exports.getEmployeesForDropdown = async (req, res) => {
  try {
    const employees = await Employee.find()
      .select("fullName department bleTag");
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// READ single employee
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate("bleTag", "bleId uuid type status")
      .populate("allowedZones", "name zoneId"); // <-- populate zone info
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//  UPDATE employee (handles BLE reassignments safely)
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    let { bleTag, fullName, department, position, allowedZones } = req.body;

    // Normalize bleTag
    if (typeof bleTag === "object" && bleTag?._id) bleTag = bleTag._id;
    if (bleTag === "") bleTag = null;

    if (bleTag && employee.bleTag?.toString() !== bleTag.toString()) {
    await assignBle(bleTag, "employee", employee._id);
}
if (!bleTag && employee.bleTag) {
    await unassignBle(employee.bleTag);
}


    // Update other fields
    employee.fullName = fullName ?? employee.fullName;
    employee.department = department ?? employee.department;
    employee.position = position ?? employee.position;
    employee.allowedZones = Array.isArray(allowedZones) ? allowedZones : [];

    await employee.save();

    // Populate BLE and allowedZones before sending response
    const populated = await Employee.findById(employee._id)
      .populate("bleTag", "bleId uuid type status")
      .populate("allowedZones", "name zoneId"); // <-- populate zone info

    res.json(populated);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Error updating employee", error: error.message });
  }
};

// DELETE employee (unlinks BLE)
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Unlink BLE if assigned
    if (employee.bleTag) {
      await unassignBle(employee.bleTag, "employee");
    }

    await Employee.findByIdAndDelete(req.params.id);

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get unassigned employees (optional)
exports.getUnassignedEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ bleTag: null });
    res.json(employees);
  } catch (err) {
    console.error("Error fetching unassigned employees:", err);
    res.status(500).json({ message: "Server error fetching unassigned employees" });
  }
};
