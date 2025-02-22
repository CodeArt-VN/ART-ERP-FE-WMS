Putaway Strategy:

Defines the sequence in which steps are followed to place received items in the warehouse.
Aims to optimize storage utilization and picking efficiency.
Steps to Create a New Putaway Strategy:

Provide basic information: name, description.
Define steps:
Each step specifies a rule for searching for an available location.
Multiple rules can be combined in a single strategy.
Rules consider factors like:
To zone/location (desired destination)
From zone/location (current location)
Item properties (type, dimensions, weight)
Existing inventory in locations
Pick locations (forward picking zones)
Dimension and weight restrictions
Sharing capacity with neighboring locations
Area restrictions (exclude specific areas)
Define location sorting logic (name or route sequence).
Overall, creating a putaway strategy involves defining a series of rules that determine how to find the most suitable location for storing received items.

1. Ưu tiên lựa chọn vị trí được chỉ định, sau đó hợp nhất hàng tồn kho theo khu vực trước khi chọn vị trí mới.
2. Ưu tiên lựa chọn vị trí được chỉ định, sau đó tìm vị trí mới theo khu vực.
3. Ưu tiên kiểm soát chất lượng (QC), sau đó tìm vị trí mới theo khu vực.
4. Tìm vị trí mới theo khu vực, bỏ qua pick locations.
5. Hợp nhất vị trí hiện có trước, sau đó tìm vị trí mới theo khu vực, ưu tiên tiết kiệm không gian.
