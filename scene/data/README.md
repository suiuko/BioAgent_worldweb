# BioAgent-World 10.21 网页开发资产

从已通过完整回合验收的 10.21 场景导出。用于本地开发 3D 查看器。

- `scene.json` 是唯一的网页资源入口。路径均相对于该文件。
- `background_sog` 是按当前场景可见性和透明度掩码导出的扫描背景，`static_geometry_glb` 是独立台面等静态可见网格。两者在网页世界坐标下按单位变换加载。
- `assets[]` 是 15 个资产组。每组使用 `position_m` 与 `rotation_xyzw` 一次，或者使用等价的 `world_from_asset`。同一组的 GLB 与 SOG 加载在同一个父节点下。
- 资源已采用米制、Y-up、右手系。位姿矩阵以 JSON 行数组存储，作用于列向量。`web_from_source` 供核对 USD 源坐标。
- `view_presets` 提供操作位 2 和 3 的相机眼点及观察目标。`reference/` 保存两个实跑镜头供位置对照。
- `dimensions_source_xyz_m` 使用源物体的局部 X/Y/Z 顺序。黑架是用户确认单位的原 STL 外形尺寸。其他尺寸为导出显示几何的边界。
- `pick_bounds_y_up_m` 是资产局部坐标下的近似拾取范围。用于浏览器点击回退，与仿真碰撞网格的用途独立。
- 透明材质和源 USD 中未解析的材质采用网页预览近似。浏览器的视觉效果需再做对照。
- 使用 `shasum -a 256 -c SHA256SUMS` 在资源目录内核对所有源文件。
