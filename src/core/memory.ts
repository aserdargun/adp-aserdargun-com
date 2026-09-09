import type { AdaptationConfig } from "./types";
import { getModel } from "./models";
import { parameters } from "./parameters";
export const GiB = 2 ** 30;
export const memoryAssumptions = [
  "All capacities use GiB (2^30 bytes), not decimal GB.",
  "Adam-like optimizer: two FP32 moments (8 bytes/trainable parameter); FP32 gradient buffers (4 bytes/trainable parameter).",
  "BF16/FP16 trainable weights use an additional FP32 master copy (4 bytes/trainable parameter); FP32 weights do not.",
  "QLoRA base: 4-bit payload + illustrative 0.127 bits/parameter metadata. Adapters retain selected 16/32-bit precision. Not every QLoRA implementation has this overhead.",
  "Activations: batch × sequence × hidden × layers × compute bytes × 8. Checkpointing multiplies by 0.3. Both constants are educational assumptions, not fitted measurements.",
  "Memory-efficient attention assumed; no materialized quadratic attention matrix. Workspace = 1 GiB + 5% of other components. No offload, sharding, allocator fragmentation or communication buffers.",
  "Memory fit is conditional on this estimate; it does not establish hardware compatibility or throughput.",
];
export function memory(c: AdaptationConfig) {
  const m = getModel(c.model),
    p = parameters(c),
    bytes = c.precision === "fp32" ? 4 : 2;
  const baseBits = c.method === "qlora" ? 4 : bytes * 8;
  const weights = (p.base * baseBits) / 8;
  const quantization = c.method === "qlora" ? (p.base * 0.127) / 8 : 0;
  const adapter = p.adapter * bytes;
  const gradients = p.trainable * 4;
  const optimizer = p.trainable * 8;
  const master = bytes === 2 ? p.trainable * 4 : 0;
  const activations =
    c.microBatch *
    c.sequence *
    m.hiddenSize *
    m.layerCount *
    bytes *
    8 *
    (c.checkpointing ? 0.3 : 1);
  const subtotal =
    weights +
    quantization +
    adapter +
    gradients +
    optimizer +
    master +
    activations;
  const workspace = GiB + subtotal * 0.05;
  const parts = {
    weights,
    quantization,
    adapter,
    gradients,
    optimizer,
    master,
    activations,
    workspace,
  };
  const total = subtotal + workspace;
  return {
    parts,
    total,
    giB: total / GiB,
    headroom: c.deviceGiB - total / GiB,
    fits: total <= c.deviceGiB * GiB,
    baseBits,
    computeBits: bytes * 8,
    artifactBytes: c.method === "full" ? weights : adapter,
  };
}
