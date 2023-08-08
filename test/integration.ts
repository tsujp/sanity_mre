import { Crs, RawBuffer, newBarretenbergApiAsync } from '@aztec/bb.js/dest/node/index.js'
import { compressWitness, executeCircuit } from '@noir-lang/acvm_js'
import ethers from 'ethers'
import { decompressSync } from 'fflate'

const acirBuffer = Buffer.from(
   'H4sIAAAAAAAA/82RSw7DMAhESVL3PGAghl2vUqvO/Y9QqbIlq12GSJ0NrJ7mcweABL/a+n30i+dEy8Ri3EVayY2Ynpi9mqJo3Y2M1PSVjbmZWPHqBZ2EGx3qfHTYGsja4jJ+fI3ubv1fgnsc7G/u2R5SYA9X5U4X5I7cHyb98T40vK2T3zdWhU+xCAQAAA==',
   'base64',
)

const acirBufferUncompressed = decompressSync(acirBuffer)

async function foo () {
   try {
      // Start init
      const api = await newBarretenbergApiAsync(4)

      // Error occurs upon call to acirGetCircuitSizes.
      const [exact, total, subgroup] = await api.acirGetCircuitSizes(
         acirBufferUncompressed,
      )

      const subgroupSize = Math.pow(2, Math.ceil(Math.log2(total)))
      const crs = await Crs.new(subgroupSize + 1)
      await api.commonInitSlabAllocator(subgroupSize)
      await api.srsInitSrs(
         new RawBuffer(crs.getG1Data()),
         crs.numPoints,
         new RawBuffer(crs.getG2Data()),
      )

      const acirComposer = await api.acirNewAcirComposer(subgroupSize)
      // ---/

      // Witness
      const input = { x: 1, y: 1 }
      const initialWitness = new Map<number, string>()
      initialWitness.set(1, ethers.utils.hexZeroPad(`0x${input.x.toString(16)}`, 32))
      initialWitness.set(2, ethers.utils.hexZeroPad(`0x${input.y.toString(16)}`, 32))

      const witnessMap = await executeCircuit(acirBuffer, initialWitness, () => {
         throw Error('unexpected oracle')
      })

      const witness = compressWitness(witnessMap)
      // ---/

      // Proof
      const proof = await api.acirCreateProof(
         acirComposer,
         acirBufferUncompressed,
         decompressSync(witness),
         false,
      )

      console.log('Proof:', proof)
      // ---/
   } catch (e) {
      console.log(e)
      throw e
   }
}

await foo()
