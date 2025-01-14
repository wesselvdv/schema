// ets_tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import { augmentRecord } from "../_utils"
import * as Arbitrary from "../Arbitrary"
import * as Constructor from "../Constructor"
import * as Encoder from "../Encoder"
import * as Guard from "../Guard"
import * as Parser from "../Parser"
import * as Th from "../These"
import { lazy } from "./lazy"
import type { DefaultSchema } from "./withDefaults"
import { withDefaults } from "./withDefaults"

export type IntersectionApi<Self, That> = Self & That extends { props: infer X }
  ? { props: { [k in keyof X]: X[k] } }
  : {}

export type IntersectionSchema<
  Self extends S.SchemaUPI,
  That extends S.SchemaUPI,
  Api
> = DefaultSchema<
  unknown,
  S.IntersectionE<
    S.MemberE<0, S.ParserErrorOf<Self>> | S.MemberE<1, S.ParserErrorOf<That>>
  >,
  S.ParsedShapeOf<Self> & S.ParsedShapeOf<That>,
  S.ConstructorInputOf<Self> & S.ConstructorInputOf<That>,
  S.IntersectionE<
    S.MemberE<0, S.ConstructorErrorOf<Self>> | S.MemberE<1, S.ConstructorErrorOf<That>>
  >,
  S.EncodedOf<Self> & S.EncodedOf<That>,
  Api
>

export const intersectIdentifier =
  S.makeAnnotation<{ self: S.SchemaUPI; that: S.SchemaUPI }>()

export function intersect_<
  ParserError extends S.AnyError,
  ParsedShape,
  ConstructorInput,
  ConstructorError extends S.AnyError,
  Encoded,
  Api,
  ThatParserError extends S.AnyError,
  ThatParsedShape,
  ThatConstructorInput,
  ThatConstructorError extends S.AnyError,
  ThatEncoded,
  ThatApi
>(
  self: S.Schema<
    unknown,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    Encoded,
    Api
  >,
  that: S.Schema<
    unknown,
    ThatParserError,
    ThatParsedShape,
    ThatConstructorInput,
    ThatConstructorError,
    ThatEncoded,
    ThatApi
  >
): DefaultSchema<
  unknown,
  S.IntersectionE<S.MemberE<0, ParserError> | S.MemberE<1, ThatParserError>>,
  ParsedShape & ThatParsedShape,
  ConstructorInput & ThatConstructorInput,
  S.IntersectionE<S.MemberE<0, ConstructorError> | S.MemberE<1, ThatConstructorError>>,
  Encoded & ThatEncoded,
  IntersectionApi<Api, ThatApi>
> {
  const guardSelf = Guard.for(self)
  const guardThat = Guard.for(that)
  const parseSelf = Parser.for(self)
  const parseThat = Parser.for(that)
  const constructSelf = Constructor.for(self)
  const constructThat = Constructor.for(that)
  const encodeSelf = Encoder.for(self)
  const encodeThat = Encoder.for(that)
  const arbSelf = Arbitrary.for(self)
  const arbThat = Arbitrary.for(that)

  const guard = (u: unknown): u is ParsedShape & ThatParsedShape =>
    guardSelf(u) && guardThat(u)

  return pipe(
    S.identity(guard),
    S.parser((u) => {
      const left = Th.result(parseSelf(u))
      const right = Th.result(parseThat(u))

      let errors = Chunk.empty<
        S.MemberE<0, ParserError> | S.MemberE<1, ThatParserError>
      >()

      let errored = false
      let warned = false

      const intersection = {} as unknown as ParsedShape & ThatParsedShape

      if (left._tag === "Left") {
        errors = Chunk.append_(errors, S.memberE(0, left.left as ParserError))

        errored = true
      } else {
        const warnings = left.right.get(1)
        if (warnings._tag === "Some") {
          errors = Chunk.append_(errors, S.memberE(0, warnings.value as ParserError))

          warned = true
        }
        Object.assign(intersection, left.right.get(0))
      }
      if (right._tag === "Left") {
        errors = Chunk.append_(errors, S.memberE(1, right.left as ThatParserError))

        errored = true
      } else {
        const warnings = right.right.get(1)
        if (warnings._tag === "Some") {
          errors = Chunk.append_(
            errors,
            S.memberE(1, warnings.value as ThatParserError)
          )

          warned = true
        }
        Object.assign(intersection, right.right.get(0))
      }

      if (errored) {
        return Th.fail(S.intersectionE(errors))
      }

      augmentRecord(intersection as {})

      if (warned) {
        return Th.warn(intersection, S.intersectionE(errors))
      }

      return Th.succeed(intersection)
    }),
    S.constructor((u: ConstructorInput & ThatConstructorInput) => {
      const left = Th.result(constructSelf(u))
      const right = Th.result(constructThat(u))

      let errors = Chunk.empty<
        S.MemberE<0, ConstructorError> | S.MemberE<1, ThatConstructorError>
      >()

      let errored = false
      let warned = false

      const intersection = {} as unknown as ParsedShape & ThatParsedShape

      if (left._tag === "Left") {
        errors = Chunk.append_(errors, S.memberE(0, left.left as ConstructorError))

        errored = true
      } else {
        const warnings = left.right.get(1)
        if (warnings._tag === "Some") {
          errors = Chunk.append_(
            errors,
            S.memberE(0, warnings.value as ConstructorError)
          )

          warned = true
        }
        Object.assign(intersection, left.right.get(0))
      }
      if (right._tag === "Left") {
        errors = Chunk.append_(errors, S.memberE(1, right.left as ThatConstructorError))

        errored = true
      } else {
        const warnings = right.right.get(1)
        if (warnings._tag === "Some") {
          errors = Chunk.append_(
            errors,
            S.memberE(1, warnings.value as ThatConstructorError)
          )

          warned = true
        }
        Object.assign(intersection, right.right.get(0))
      }

      if (errored) {
        return Th.fail(S.intersectionE(errors))
      }

      augmentRecord(intersection as {})

      if (warned) {
        return Th.warn(intersection, S.intersectionE(errors))
      }

      return Th.succeed(intersection)
    }),
    S.encoder((_): Encoded & ThatEncoded => ({
      ...encodeSelf(_),
      ...encodeThat(_)
    })),
    S.arbitrary((FC) => {
      const self = arbSelf(FC)
      const that = arbThat(FC)
      return self.chain((a) => that.map((b) => ({ ...a, ...b })))
    }),
    S.mapApi(() => {
      const props = {}
      if ("props" in self.Api) {
        for (const k of Object.keys(self.Api["props"])) {
          props[k] = self.Api["props"][k]
        }
      }
      if ("props" in that.Api) {
        for (const k of Object.keys(that.Api["props"])) {
          props[k] = that.Api["props"][k]
        }
      }
      if (Object.keys(props).length > 0) {
        return { props } as IntersectionApi<Api, ThatApi>
      }
      return {} as IntersectionApi<Api, ThatApi>
    }),
    withDefaults,
    S.annotate(intersectIdentifier, { self, that })
  )
}

export function intersect<
  ThatParserError extends S.AnyError,
  ThatParsedShape,
  ThatConstructorInput,
  ThatConstructorError extends S.AnyError,
  ThatEncoded,
  ThatApi
>(
  that: S.Schema<
    unknown,
    ThatParserError,
    ThatParsedShape,
    ThatConstructorInput,
    ThatConstructorError,
    ThatEncoded,
    ThatApi
  >
): <
  ParserError extends S.AnyError,
  ParsedShape,
  ConstructorInput,
  ConstructorError extends S.AnyError,
  Encoded,
  Api
>(
  self: S.Schema<
    unknown,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    Encoded,
    Api
  >
) => DefaultSchema<
  unknown,
  S.IntersectionE<S.MemberE<0, ParserError> | S.MemberE<1, ThatParserError>>,
  ParsedShape & ThatParsedShape,
  ConstructorInput & ThatConstructorInput,
  S.IntersectionE<S.MemberE<0, ConstructorError> | S.MemberE<1, ThatConstructorError>>,
  Encoded & ThatEncoded,
  IntersectionApi<Api, ThatApi>
> {
  return (self) => intersect_(self, that)
}

export function intersectLazy<
  ThatParserError extends S.AnyError,
  ThatParsedShape,
  ThatConstructorInput,
  ThatConstructorError extends S.AnyError,
  ThatEncoded,
  ThatApi
>(
  that: () => S.Schema<
    unknown,
    ThatParserError,
    ThatParsedShape,
    ThatConstructorInput,
    ThatConstructorError,
    ThatEncoded,
    ThatApi
  >
) {
  return <
    ParserError extends S.AnyError,
    ParsedShape,
    ConstructorInput,
    ConstructorError extends S.AnyError,
    Encoded,
    Api
  >(
    self: S.Schema<
      unknown,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      Encoded,
      Api
    >
  ): DefaultSchema<
    unknown,
    S.IntersectionE<S.MemberE<0, ParserError> | S.MemberE<1, ThatParserError>>,
    ParsedShape & ThatParsedShape,
    ConstructorInput & ThatConstructorInput,
    S.IntersectionE<
      S.MemberE<0, ConstructorError> | S.MemberE<1, ThatConstructorError>
    >,
    Encoded & ThatEncoded,
    Api
  > => {
    return pipe(
      intersect_(self, lazy(that)),
      S.mapApi(() => self.Api),
      withDefaults
    )
  }
}
