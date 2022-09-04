// import { Entity, PrimaryKey, Column } from "@mikro-orm/core";
import { Field, ObjectType } from "type-graphql";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BaseEntity } from "typeorm";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;
  
  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
  
  @Field()
  @Column({ unique: true })
  nick_name!: string;

  @Column()
  password!: string;

  @Field()
  @Column({ unique: true })
  email!: string;
}
